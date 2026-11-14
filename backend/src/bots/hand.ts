// Helpers of the bot policies that read the bot's own view. They describe the bot's hand and the
// public table; the legality of actions always comes from `getLegalActions`.

import {
  CARD_COLORS,
  isColoredCard,
  type Card,
  type CardColor,
  type LegalAction,
  type PlayCardsAction,
  type PlayerMatchView,
  type PublicPlayerView
} from "@wildhand/shared";

export function isPlay(action: LegalAction): action is PlayCardsAction {
  return action.type === "play";
}

/** The played cards of an action, in play order. */
export function playedCards(view: PlayerMatchView, action: PlayCardsAction): Card[] {
  return action.cardIds.map((cardId) => view.hand.find((card) => card.id === cardId)!);
}

/** The card that becomes the top card. */
export function lastCard(view: PlayerMatchView, action: PlayCardsAction): Card {
  return playedCards(view, action)[action.cardIds.length - 1];
}

/** The hand after the action's cards and the given Swap card left it. */
export function remainingHand(view: PlayerMatchView, action: PlayCardsAction): Card[] {
  const leaving = new Set(action.swapCardId === undefined ? action.cardIds : [...action.cardIds, action.swapCardId]);
  return view.hand.filter((card) => !leaving.has(card.id));
}

export function colorCounts(cards: readonly Card[]): Record<CardColor, number> {
  const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const card of cards) {
    if (isColoredCard(card)) {
      counts[card.color] += 1;
    }
  }
  return counts;
}

/** The color held most often; the first color in `CARD_COLORS` order on a tie. */
export function strongestColor(cards: readonly Card[]): CardColor {
  const counts = colorCounts(cards);
  return CARD_COLORS.reduce((best, color) => (counts[color] > counts[best] ? color : best), CARD_COLORS[0]);
}

/** Other active players. */
export function opponents(view: PlayerMatchView): PublicPlayerView[] {
  return view.players.filter((player) => player.userId !== view.userId && player.matchStatus === "active");
}

/** The opponent with the fewest cards, the earliest seat on a tie. */
export function leader(view: PlayerMatchView): PublicPlayerView | undefined {
  return opponents(view).reduce<PublicPlayerView | undefined>(
    (best, player) => (best === undefined || player.handSize < best.handSize ? player : best),
    undefined
  );
}

/** The next active, connected player clockwise: the one who plays after the bot. */
export function nextPlayer(view: PlayerMatchView): PublicPlayerView | undefined {
  const count = view.players.length;
  const index = view.players.findIndex((player) => player.userId === view.userId);
  for (let step = 1; step < count; step++) {
    const player = view.players[(index + step) % count];
    if (player.matchStatus === "active" && player.presence === "connected") {
      return player;
    }
  }
  return undefined;
}

/**
 * How useful a card is to keep: wild cards answer anything, +2 defends a penalty, and a number
 * card is worth more when the hand has other cards of its color or number.
 */
export function keepValue(card: Card, hand: readonly Card[]): number {
  switch (card.kind) {
    case "storm":
    case "colorChange":
      return 10;
    case "plus2":
      return 9;
    case "spy":
      return 8;
    case "swap":
      return 4 + colorCounts(hand)[card.color] * 0.5;
    case "number": {
      const sameColor = hand.filter((other) => other !== card && isColoredCard(other) && other.color === card.color).length;
      const sameNumber = hand.filter((other) => other !== card && other.kind === "number" && other.number === card.number).length;
      return sameColor + sameNumber * 1.5;
    }
  }
}

/** Turns needed to play the hand out: one per number group and one per special card. */
export function turnsNeeded(hand: readonly Card[]): number {
  const numbers = new Set<number>();
  let specials = 0;
  for (const card of hand) {
    if (card.kind === "number") {
      numbers.add(card.number);
    } else {
      specials++;
    }
  }
  return numbers.size + specials;
}
