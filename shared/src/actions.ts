// Every distinct action the viewer can take now (docs/03 section 3), built only from the viewer's
// own view and the rule helpers of `legality.ts`. Used by the computer players; the server still
// validates every action.
//
// Actions are canonical: plays that differ only in interchangeable cards (two copies of the same
// card) or in the order of the middle cards of a combo are listed once. The blind Swap position is
// not part of an action, because it carries no information (R12); it is chosen when the action is
// sent.

import { CARD_COLORS, isNumberCard, type Card, type CardColor, type NumberCard } from "./cards.js";
import {
  drawOptionFor,
  getLegalCards,
  getSwapOffers,
  getValidTargets,
  isViewersTurn,
  type DrawOption
} from "./legality.js";
import type { PlayerMatchView } from "./views.js";

/** `game:draw`: take the +2 penalty, draw one card, or pass at 20 cards (R10, R15, R17). */
export interface DrawAction {
  type: "draw";
  option: DrawOption;
}

/** `game:play` without the blind Swap position. The last card becomes the top card (R8). */
export interface PlayCardsAction {
  type: "play";
  cardIds: string[];
  chosenColor?: CardColor;
  targetPlayerId?: string;
  /** The card given away with Swap; absent when the Swap is the last card (R12). */
  swapCardId?: string;
}

export type LegalAction = DrawAction | PlayCardsAction;

/** Cards with the same signature are interchangeable. */
export function cardSignature(card: Card): string {
  switch (card.kind) {
    case "number":
      return `${card.color}-${card.number}`;
    case "plus2":
    case "swap":
      return `${card.color}-${card.kind}`;
    default:
      return card.kind;
  }
}

/**
 * Distinct legal actions of the viewer; empty when it is not their turn. The sampling bot calls this
 * for every simulated turn, so the legal cards are computed only once.
 */
export function getLegalActions(view: PlayerMatchView): LegalAction[] {
  if (!isViewersTurn(view)) {
    return [];
  }

  const actions: LegalAction[] = [];
  const allLegal = getLegalCards(view);
  const legalCards = uniqueBySignature(allLegal);
  const targets = getValidTargets(view);

  for (const card of legalCards) {
    if (isNumberCard(card)) {
      continue;
    }

    switch (card.kind) {
      case "colorChange":
        for (const color of CARD_COLORS) {
          actions.push({ type: "play", cardIds: [card.id], chosenColor: color });
        }
        break;
      case "spy":
        for (const target of targets) {
          actions.push({ type: "play", cardIds: [card.id], targetPlayerId: target.userId });
        }
        break;
      case "swap": {
        const offers = uniqueBySignature(getSwapOffers(view, card));
        for (const target of targets) {
          if (offers.length === 0) {
            actions.push({ type: "play", cardIds: [card.id], targetPlayerId: target.userId });
          }
          for (const offer of offers) {
            actions.push({ type: "play", cardIds: [card.id], targetPlayerId: target.userId, swapCardId: offer.id });
          }
        }
        break;
      }
      default:
        actions.push({ type: "play", cardIds: [card.id] });
    }
  }

  actions.push(...numberPlays(view.hand, new Set(allLegal.map((card) => card.id))));

  const drawOption = drawOptionFor({
    pendingPenalty: view.pendingPenalty,
    handSize: view.hand.length,
    hasLegalCard: allLegal.length > 0
  });
  if (drawOption !== null) {
    actions.push({ type: "draw", option: drawOption });
  }

  return actions;
}

/**
 * Single number cards and combos (R8): any group of cards with the same number that contains a
 * legal card to start with. Cards of the same number differ only in color, and all cards of one
 * color and number are equally legal, so a combo is a count per color plus the color of the last
 * card, which becomes the top card.
 */
function numberPlays(hand: readonly Card[], legalIds: ReadonlySet<string>): PlayCardsAction[] {
  // Number -> color -> cards, for the numbers that have a legal card, in hand order.
  const groups = new Map<number, Map<CardColor, NumberCard[]>>();
  for (const card of hand) {
    if (isNumberCard(card) && legalIds.has(card.id) && !groups.has(card.number)) {
      groups.set(card.number, new Map());
    }
  }
  for (const card of hand) {
    if (isNumberCard(card)) {
      const byColor = groups.get(card.number);
      const cards = byColor?.get(card.color);
      if (cards) {
        cards.push(card);
      } else {
        byColor?.set(card.color, [card]);
      }
    }
  }

  const plays: PlayCardsAction[] = [];
  for (const byColor of groups.values()) {
    const colors: NumberCard[][] = [];
    for (const color of CARD_COLORS) {
      const cards = byColor.get(color);
      if (cards) {
        colors.push(cards);
      }
    }
    const legal = colors.map((cards) => legalIds.has(cards[0].id));
    const counts = colors.map(() => 0);
    let total = 0;

    // Every count vector, like an odometer.
    for (;;) {
      let position = colors.length - 1;
      while (position >= 0 && counts[position] === colors[position].length) {
        total -= counts[position];
        counts[position] = 0;
        position--;
      }
      if (position < 0) {
        break;
      }
      counts[position]++;
      total++;

      for (let lastColor = 0; lastColor < colors.length; lastColor++) {
        if (counts[lastColor] === 0) {
          continue;
        }

        let firstColor = -1;
        if (total === 1) {
          firstColor = legal[lastColor] ? lastColor : -1;
        } else {
          for (let color = 0; color < colors.length; color++) {
            if (legal[color] && counts[color] - (color === lastColor ? 1 : 0) > 0) {
              firstColor = color;
              break;
            }
          }
        }
        if (firstColor < 0) {
          continue;
        }

        const first = colors[firstColor][0];
        const last = colors[lastColor][counts[lastColor] - 1];
        const cardIds = [first.id];
        for (let color = 0; color < colors.length; color++) {
          for (let index = 0; index < counts[color]; index++) {
            const card = colors[color][index];
            if (card !== first && card !== last) {
              cardIds.push(card.id);
            }
          }
        }
        if (last !== first) {
          cardIds.push(last.id);
        }
        plays.push({ type: "play", cardIds });
      }
    }
  }

  return plays;
}

function uniqueBySignature(cards: Card[]): Card[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const signature = cardSignature(card);
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}
