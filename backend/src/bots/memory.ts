// What a computer player remembers (docs/03 section 3). It is built only from the messages the bot
// receives, exactly like a human client: its own views, the public effects, and its own Spy and Swap
// results. It never reads the authoritative match state.

import {
  createDeck,
  isPlayableOn,
  type Card,
  type GameEffect,
  type PlayableContext,
  type PlayerMatchView,
  type SpyReveal,
  type SwapResult
} from "@wildhand/shared";

/**
 * Inferred from a draw or a pass (R10, R15, R17): when the player drew, none of the cards they held
 * then could be played on `context`. `remaining` is how many of those cards they still hold at
 * least: every card they played or gave away since may have been one of them.
 */
export interface HandConstraint {
  context: PlayableContext;
  remaining: number;
}

/** Older inferences are dropped; the newest ones say the most about the current hand. */
const MAX_CONSTRAINTS = 4;

/** Plain copy of a memory, so a search in a worker thread can rebuild it. */
export interface BotMemorySnapshot {
  userId: string;
  discard: Card[];
  decks: number;
  known: [string, Card[]][];
  constraints: [string, HandConstraint[]][];
  forfeits: string[];
  latestView: PlayerMatchView | null;
}

export class BotMemory {
  /** Cards on the discard pile since the last recycling, top card last (R19). */
  private discard: Card[] = [];
  private decks = 1;
  /** Cards known to be in other players' hands, by user ID. */
  private readonly known = new Map<string, Map<string, Card>>();
  private readonly constraints = new Map<string, HandConstraint[]>();
  private readonly forfeits: string[] = [];
  private latestView: PlayerMatchView | null = null;

  constructor(readonly userId: string) {}

  static fromSnapshot(snapshot: BotMemorySnapshot): BotMemory {
    const memory = new BotMemory(snapshot.userId);
    memory.discard = snapshot.discard;
    memory.decks = snapshot.decks;
    for (const [userId, cards] of snapshot.known) {
      memory.known.set(userId, new Map(cards.map((card) => [card.id, card])));
    }
    for (const [userId, constraints] of snapshot.constraints) {
      memory.constraints.set(userId, constraints);
    }
    memory.forfeits.push(...snapshot.forfeits);
    memory.latestView = snapshot.latestView;
    return memory;
  }

  toSnapshot(): BotMemorySnapshot {
    return {
      userId: this.userId,
      discard: [...this.discard],
      decks: this.decks,
      known: [...this.known].map(([userId, cards]) => [userId, [...cards.values()]]),
      constraints: [...this.constraints].map(([userId, constraints]) => [userId, [...constraints]]),
      forfeits: [...this.forfeits],
      latestView: this.latestView
    };
  }

  get view(): PlayerMatchView | null {
    return this.latestView;
  }

  get decksInPlay(): number {
    return this.decks;
  }

  get discardPile(): readonly Card[] {
    return this.discard;
  }

  /** Forfeited players in forfeit order. */
  get forfeitOrder(): readonly string[] {
    return this.forfeits;
  }

  observeState(view: PlayerMatchView): void {
    if (this.discard.length === 0 || this.discard[this.discard.length - 1].id !== view.topCard.id) {
      // The first view (the starting card), or a view the effects did not explain.
      if (!this.discard.some((card) => card.id === view.topCard.id)) {
        this.discard.push(view.topCard);
      }
    }
    this.latestView = view;
  }

  /** Effects arrive before the new view, so `latestView` still shows the table the action was taken on. */
  observeEffect(effect: GameEffect): void {
    switch (effect.type) {
      case "cardsPlayed": {
        this.discard.push(...effect.cards);
        const known = this.known.get(effect.userId);
        for (const card of effect.cards) {
          known?.delete(card.id);
        }
        this.reduceConstraints(effect.userId, effect.cards.length);
        break;
      }
      case "cardDrawn":
        this.inferFromDraw(effect.draw.userId);
        break;
      case "penaltyDrawn":
        this.inferFromDraw(effect.draw.userId);
        break;
      case "passed":
        this.inferFromDraw(effect.userId);
        break;
      case "reshuffle":
        this.discard = this.discard.slice(-1);
        this.decks = effect.decksInPlay;
        break;
      case "swap":
        if (effect.exchanged) {
          // Each side gave away one card, possibly one of those an inference is about.
          this.reduceConstraints(effect.actorId, 1);
          this.reduceConstraints(effect.targetId, 1);
          // A blind exchange between two other players: the target lost an unknown card and the
          // actor gave away an unknown one, so what was known about both is no longer reliable.
          if (effect.actorId !== this.userId && effect.targetId !== this.userId) {
            this.known.delete(effect.actorId);
            this.known.delete(effect.targetId);
          }
        }
        break;
      case "playerForfeited":
        this.forfeits.push(effect.userId);
        this.forget(effect.userId);
        break;
      case "playerFinished":
        this.forget(effect.userId);
        break;
    }
  }

  /** A Spy snapshot (R14): the whole hand of the target at that moment. */
  observeSpy(reveal: SpyReveal): void {
    this.known.set(reveal.targetPlayerId, new Map(reveal.hand.map((card) => [card.id, card])));
    // The snapshot replaces every inference about the hand.
    this.constraints.delete(reveal.targetPlayerId);
  }

  /** A Swap this bot took part in (R12): the other player now holds `given` and no longer `received`. */
  observeSwap(result: SwapResult): void {
    const known = this.known.get(result.otherPlayerId) ?? new Map<string, Card>();
    known.delete(result.received.id);
    known.set(result.given.id, result.given);
    this.known.set(result.otherPlayerId, known);
  }

  /** Cards known to be in `userId`'s hand. */
  knownCards(userId: string): Card[] {
    return [...(this.known.get(userId)?.values() ?? [])];
  }

  /** Inferences about `userId`'s hand that still apply, the strongest first. */
  constraintsOf(userId: string): readonly HandConstraint[] {
    return this.constraints.get(userId) ?? [];
  }

  /**
   * Cards whose location the bot cannot see: in other hands, in the draw pile, or removed with a
   * forfeited hand. Every card of the decks in play except the bot's own hand and the discard pile.
   */
  unseenCards(hand: readonly Card[]): Card[] {
    const seen = new Set([...hand, ...this.discard].map((card) => card.id));
    const unseen: Card[] = [];
    for (let deck = 1; deck <= this.decks; deck++) {
      for (const card of createDeck(deck)) {
        if (!seen.has(card.id)) {
          unseen.push(card);
        }
      }
    }
    return unseen;
  }

  /**
   * A player who drew or passed had no card to play on the table they saw. Assumes the player draws
   * only when they must; a voluntary draw makes the inference wrong, which only makes the bot's
   * samples less accurate. Draws made for a disconnected player say nothing.
   */
  private inferFromDraw(userId: string): void {
    const view = this.latestView;
    const player = view?.players.find((candidate) => candidate.userId === userId);
    if (!view || !player || userId === this.userId || player.presence !== "connected" || player.handSize === 0) {
      return;
    }

    const context = { topCard: view.topCard, activeColor: view.activeColor, pendingPenalty: view.pendingPenalty };
    // Known cards that contradict the inference show it was a voluntary draw.
    if (this.knownCards(userId).some((card) => isPlayableOn(card, context))) {
      return;
    }

    const constraints = [{ context, remaining: player.handSize }, ...this.constraintsOf(userId)];
    this.constraints.set(userId, constraints.slice(0, MAX_CONSTRAINTS));
  }

  private reduceConstraints(userId: string, count: number): void {
    const constraints = this.constraints.get(userId);
    if (!constraints) {
      return;
    }
    const reduced = constraints
      .map((constraint) => ({ ...constraint, remaining: constraint.remaining - count }))
      .filter((constraint) => constraint.remaining > 0);
    this.constraints.set(userId, reduced);
  }

  private forget(userId: string): void {
    this.known.delete(userId);
    this.constraints.delete(userId);
  }
}
