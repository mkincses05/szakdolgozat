// Building blocks of the sampling bot (docs/03 section 3): consistent random determinizations of
// the hidden information, engine playouts, and the evaluation of a simulated outcome.

import {
  getLegalActions,
  isPlayableOn,
  type Card,
  type LegalAction,
  type PlayCardsAction,
  type PlayerMatchView
} from "@wildhand/shared";
import { applyDraw, applyPlay } from "../engine/actions.js";
import { shuffle, type Rng } from "../engine/rng.js";
import { findPlayer, topCard, type EngineResult, type MatchPlayer, type MatchState, type PlayAction } from "../engine/state.js";
import { turnsNeeded } from "./hand.js";
import type { BotMemory, HandConstraint } from "./memory.js";

/** Chooses an action from the player's own view. */
export type Policy = (view: PlayerMatchView, actions: readonly LegalAction[]) => LegalAction;

/** Turns a legal action into the `game:play` selection; the blind Swap position is random (R12). */
export function toPlayAction(action: PlayCardsAction, targetHandSize: number, rng: Rng): PlayAction {
  const { type: _type, ...selection } = action;
  if (selection.swapCardId === undefined) {
    return selection;
  }
  return { ...selection, targetCardPosition: rng.nextInt(0, Math.max(0, targetHandSize - 1)) };
}

/** Applies a legal action of the current player to a full state. */
export function applyLegalAction(state: MatchState, userId: string, action: LegalAction, rng: Rng): EngineResult {
  if (action.type === "draw") {
    return applyDraw(state, userId, rng);
  }
  const targetHandSize =
    action.targetPlayerId === undefined ? 0 : (findPlayer(state, action.targetPlayerId)?.hand.length ?? 0);
  return applyPlay(state, userId, toPlayAction(action, targetHandSize, rng), rng);
}

/**
 * One complete state consistent with everything the bot knows: its own hand, the public table,
 * the known cards of other players (Spy, Swap), every hand size, and what their draws revealed
 * (`HandConstraint`). The remaining unseen cards are dealt randomly to the other hands, the draw
 * pile, and the removed hands of forfeited players; a hand with an inference gets cards that fit it
 * whenever the pool still has such cards.
 */
export function determinize(
  view: PlayerMatchView,
  memory: BotMemory,
  rng: Rng,
  /** `memory.unseenCards(view.hand)`, passed in when many samples are drawn for one decision. */
  unseen: readonly Card[] = memory.unseenCards(view.hand)
): MatchState {
  const unseenIds = new Set(unseen.map((card) => card.id));

  const placed = new Map<string, Card[]>();
  const placedIds = new Set<string>();
  for (const player of view.players) {
    if (player.userId === view.userId || player.matchStatus !== "active") {
      continue;
    }
    const known = memory
      .knownCards(player.userId)
      .filter((card) => unseenIds.has(card.id) && !placedIds.has(card.id))
      .slice(0, player.handSize);
    placed.set(player.userId, known);
    known.forEach((card) => placedIds.add(card.id));
  }

  const pool = shuffle(
    unseen.filter((card) => !placedIds.has(card.id)),
    rng
  );

  // The most constrained hands are dealt first, while the pool still has fitting cards.
  const dealt = new Map<string, Card[]>();
  const opponents = view.players
    .filter((player) => player.userId !== view.userId && player.matchStatus === "active")
    .map((player) => ({ player, constraints: memory.constraintsOf(player.userId) }))
    .sort((a, b) => strength(b.constraints) - strength(a.constraints));
  for (const { player, constraints } of opponents) {
    dealt.set(player.userId, dealHand(placed.get(player.userId)!, player.handSize, constraints, pool));
  }

  const players: MatchPlayer[] = view.players.map((player) => {
    const hand = player.userId === view.userId ? [...view.hand] : (dealt.get(player.userId) ?? []);
    return {
      userId: player.userId,
      seat: player.seat,
      hand,
      matchStatus: player.matchStatus,
      presence: player.presence,
      finishPosition: player.finishPosition,
      isBot: player.isBot,
      botLevel: player.botLevel
    };
  });

  const drawPile = pool.splice(Math.max(0, pool.length - view.drawPileSize));
  const discardPile = [...memory.discardPile];
  if (discardPile.length === 0 || discardPile[discardPile.length - 1].id !== view.topCard.id) {
    discardPile.push(view.topCard);
  }

  const forfeited = new Set(view.players.filter((player) => player.matchStatus === "forfeited").map((p) => p.userId));

  return {
    id: view.matchId,
    phase: view.phase,
    players,
    currentPlayerId: view.currentPlayerId,
    drawPile,
    discardPile,
    removedCards: pool,
    activeColor: view.activeColor,
    pendingPenalty: view.pendingPenalty,
    decksInPlay: memory.decksInPlay,
    stateVersion: view.stateVersion,
    finishingOrder: [...view.finishingOrder],
    forfeitOrder: memory.forfeitOrder.filter((userId) => forfeited.has(userId)),
    endReason: null
  };
}

function strength(constraints: readonly HandConstraint[]): number {
  return constraints.reduce((max, constraint) => Math.max(max, constraint.remaining), 0);
}

/**
 * Completes a hand from the shuffled pool. The i-th unknown card must fit every inference that
 * still covers at least i + 1 cards; when no card in the pool fits, any card is taken.
 */
function dealHand(known: readonly Card[], size: number, constraints: readonly HandConstraint[], pool: Card[]): Card[] {
  const hand = [...known];
  for (let unknown = 0; hand.length < size && pool.length > 0; unknown++) {
    const active = constraints.filter((constraint) => constraint.remaining > unknown);
    let index = pool.length - 1;
    if (active.length > 0) {
      // The pool is shuffled, so the first fitting card from the end is a random fitting card.
      for (let candidate = pool.length - 1; candidate >= 0; candidate--) {
        if (active.every((constraint) => !isPlayableOn(pool[candidate], constraint.context))) {
          index = candidate;
          break;
        }
      }
    }
    hand.push(pool.splice(index, 1)[0]);
  }
  return hand;
}

/**
 * The player's own view of a simulated state, built without copying: playout policies only read
 * it. Contains only what `toMatchView` would send to that player.
 */
function playoutView(state: MatchState, userId: string): PlayerMatchView {
  return {
    viewer: "player",
    userId,
    hand: findPlayer(state, userId)!.hand,
    matchId: state.id,
    phase: state.phase,
    players: state.players.map((player) => ({
      userId: player.userId,
      displayName: player.userId,
      seat: player.seat,
      handSize: player.hand.length,
      matchStatus: player.matchStatus,
      presence: player.presence,
      finishPosition: player.finishPosition,
      isBot: player.isBot,
      botLevel: player.botLevel
    })),
    currentPlayerId: state.currentPlayerId,
    topCard: topCard(state),
    activeColor: state.activeColor,
    pendingPenalty: state.pendingPenalty,
    drawPileSize: state.drawPile.length,
    turnDeadline: null,
    serverTime: 0,
    finishingOrder: state.finishingOrder,
    stateVersion: state.stateVersion
  };
}

/** Plays up to `maxActions` actions with `policy` for every player, from their own views. */
export function playout(state: MatchState, policy: Policy, maxActions: number, rng: Rng): MatchState {
  let current = state;
  for (let step = 0; step < maxActions; step++) {
    const userId = current.currentPlayerId;
    if (current.phase !== "awaiting_action" || userId === null) {
      break;
    }

    const view = playoutView(current, userId);
    const actions = getLegalActions(view);
    if (actions.length === 0) {
      break;
    }

    const result = applyLegalAction(current, userId, policy(view, actions), rng);
    if (!result.ok) {
      break;
    }
    current = result.state;
  }
  return current;
}

/**
 * Value of a simulated state for `userId` in [0, 1]: 1 for first place, 0 for last. A player who
 * has not finished yet is ranked among the other active players by the number of turns they still
 * need to empty their hand, which predicts the finishing order better than the hand size
 * (docs/05, entry 11).
 */
export function outcomeValue(state: MatchState, userId: string): number {
  const count = state.players.length;
  const me = findPlayer(state, userId)!;
  let position: number;

  if (me.finishPosition !== null) {
    position = me.finishPosition;
  } else {
    const others = state.players.filter((player) => player.matchStatus === "active" && player !== me);
    const mine = turnsNeeded(me.hand);
    const fewer = others.filter((player) => turnsNeeded(player.hand) < mine).length;
    const equal = others.filter((player) => turnsNeeded(player.hand) === mine).length;
    position = state.finishingOrder.length + 1 + fewer + equal / 2;
  }

  return count <= 1 ? 1 : 1 - (position - 1) / (count - 1);
}
