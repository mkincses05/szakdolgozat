// Fixed priority rules (docs/03 section 3). The level-2 bot follows a plain rule list
// (`chooseBySimpleRules`); the fuller rule list (`chooseByRules`) is the playout policy of the
// sampling bot. Both use only the player's own view and are cheap to evaluate, because the sampling
// bot calls the fuller list for every simulated turn.

import type { Card, CardKind, LegalAction, PlayCardsAction, PlayerMatchView } from "@wildhand/shared";
import { colorCounts, isPlay, keepValue, leader, nextPlayer, remainingHand, strongestColor } from "./hand.js";
import type { Bot } from "./types.js";

/** An opponent with this many cards or fewer is close to finishing. */
const DANGER_HAND_SIZE = 2;

/**
 * Level 2. Plays one card per turn, so it never uses combos (R8): the measurements showed that with
 * the fuller rules the level was hardly weaker than the heuristic bot (docs/05, entry 13).
 */
export const ruleBasedBot: Bot = {
  level: "rule_based",
  decide: ({ view, actions }) => chooseBySimpleRules(view, actions)
};

/** The plays of each card kind, by the kind of the card that becomes the top card, and the draw. */
interface SortedActions {
  draw: LegalAction | undefined;
  ofKind(kind: CardKind): PlayCardsAction[];
  /** The card that becomes the top card. */
  last(action: PlayCardsAction): Card;
}

function sortActions(view: PlayerMatchView, actions: readonly LegalAction[]): SortedActions {
  const cards = new Map(view.hand.map((card) => [card.id, card]));
  const last = (action: PlayCardsAction) => cards.get(action.cardIds[action.cardIds.length - 1])!;
  const byKind = new Map<CardKind, PlayCardsAction[]>();
  let draw: LegalAction | undefined;
  for (const action of actions) {
    if (!isPlay(action)) {
      draw = action;
      continue;
    }
    const kind = last(action).kind;
    const list = byKind.get(kind);
    if (list) {
      list.push(action);
    } else {
      byKind.set(kind, [action]);
    }
  }
  return { draw, ofKind: (kind) => byKind.get(kind) ?? [], last };
}

/**
 * The fuller rule list, used for the sampling bot's playouts. Priorities, first match wins:
 * 1. A +2 penalty is answered with a +2 (chain); otherwise the penalty is drawn.
 * 2. An opponent who plays next and is about to finish is hit with +2 or Storm.
 * 3. The longest number combo, ending on the color the bot holds most.
 * 4. Swap: the least useful card goes to the opponent with the fewest cards.
 * 5. Color Change to the color the bot holds most.
 * 6. Spy on the opponent with the fewest cards.
 * 7. Storm.
 * 8. +2, kept until now to answer a penalty.
 * 9. Draw (or pass at 20 cards).
 */
export function chooseByRules(view: PlayerMatchView, actions: readonly LegalAction[]): LegalAction {
  const { draw, ofKind, last } = sortActions(view, actions);

  // 1
  if (view.pendingPenalty > 0) {
    return ofKind("plus2")[0] ?? draw ?? actions[0];
  }

  // 2
  const next = nextPlayer(view);
  if (next && next.handSize <= DANGER_HAND_SIZE) {
    const attack = ofKind("plus2")[0] ?? ofKind("storm")[0];
    if (attack) {
      return attack;
    }
  }

  // 3: the number of cards of the last card's color left in hand after the combo.
  const numberPlays = ofKind("number");
  if (numberPlays.length > 0) {
    const handColors = colorCounts(view.hand);
    return best(numberPlays, (action) => {
      const lastCard = last(action);
      if (lastCard.kind !== "number") {
        return 0;
      }
      const played = action.cardIds.filter((cardId) => {
        const card = view.hand.find((candidate) => candidate.id === cardId)!;
        return card.kind === "number" && card.color === lastCard.color;
      }).length;
      return action.cardIds.length * 100 + handColors[lastCard.color] - played;
    });
  }

  // 4
  const swaps = ofKind("swap");
  if (swaps.length > 0) {
    const target = leader(view)?.userId;
    const toLeader = swaps.filter((action) => action.targetPlayerId === target);
    return best(toLeader.length > 0 ? toLeader : swaps, (action) => {
      if (action.swapCardId === undefined) {
        return 0;
      }
      const offered = view.hand.find((card) => card.id === action.swapCardId)!;
      return -keepValue(offered, remainingHand(view, action));
    });
  }

  // 5
  const colorChanges = ofKind("colorChange");
  if (colorChanges.length > 0) {
    const color = strongestColor(remainingHand(view, colorChanges[0]));
    return colorChanges.find((action) => action.chosenColor === color) ?? colorChanges[0];
  }

  // 6
  const spies = ofKind("spy");
  if (spies.length > 0) {
    const target = leader(view)?.userId;
    return spies.find((action) => action.targetPlayerId === target) ?? spies[0];
  }

  // 7, 8, 9
  return ofKind("storm")[0] ?? ofKind("plus2")[0] ?? draw ?? actions[0];
}

/**
 * The level-2 rule list, without any planning:
 * 1. A +2 penalty is answered with a +2 (chain); otherwise the penalty is drawn.
 * 2. The first playable number card in the hand, alone.
 * 3. Swap, Color Change (to the color held most), Spy, Storm, +2, in this order, each with the first
 *    target and the first card to give away.
 * 4. Draw (or pass at 20 cards).
 */
export function chooseBySimpleRules(view: PlayerMatchView, actions: readonly LegalAction[]): LegalAction {
  const { draw, ofKind } = sortActions(view, actions);

  if (view.pendingPenalty > 0) {
    return ofKind("plus2")[0] ?? draw ?? actions[0];
  }

  const single = ofKind("number").find((action) => action.cardIds.length === 1);
  if (single) {
    return single;
  }

  const colorChanges = ofKind("colorChange");
  if (ofKind("swap").length === 0 && colorChanges.length > 0) {
    const color = strongestColor(remainingHand(view, colorChanges[0]));
    return colorChanges.find((action) => action.chosenColor === color) ?? colorChanges[0];
  }

  return ofKind("swap")[0] ?? ofKind("spy")[0] ?? ofKind("storm")[0] ?? ofKind("plus2")[0] ?? draw ?? actions[0];
}

/** The action with the highest score; the first one on a tie, so the choice is deterministic. */
function best(actions: readonly PlayCardsAction[], score: (action: PlayCardsAction) => number): PlayCardsAction {
  let bestAction = actions[0];
  let bestScore = score(bestAction);
  for (const action of actions.slice(1)) {
    const value = score(action);
    if (value > bestScore) {
      bestAction = action;
      bestScore = value;
    }
  }
  return bestAction;
}
