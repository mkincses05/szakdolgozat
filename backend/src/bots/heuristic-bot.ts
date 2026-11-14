// Level 3: scores every legal action with a weighted evaluation of the situation after it
// (docs/03 section 3) and plays the best one. The weights can be tuned with the simulator.

import {
  STORM_MAX,
  STORM_MIN,
  isPlayableOn,
  type Card,
  type LegalAction,
  type PlayerMatchView,
  type PublicPlayerView
} from "@wildhand/shared";
import { isPlay, keepValue, lastCard, nextPlayer, opponents, remainingHand, turnsNeeded } from "./hand.js";
import type { BotMemory } from "./memory.js";
import type { Bot } from "./types.js";

export interface HeuristicWeights {
  /**
   * Per turn the bot still needs to empty its hand. One turn plays a whole group of number cards
   * with the same number (R8) or one special card (R9), so this counts groups, not cards.
   */
  turns: number;
  /** Per card the bot's hand grows (negative when it shrinks). */
  handGrowth: number;
  /** Per share of the remaining hand that can follow the new top card next turn. */
  followUp: number;
  /** Per +2 or wild card kept in hand to answer a penalty or a bad top card. */
  reserve: number;
  /** Per expected card an attack makes an opponent draw, scaled by how close they are to finishing. */
  pressure: number;
  /** Per point of `keepValue` of the card given away with Swap (negative: give away useless cards). */
  swapGiven: number;
  /** For Spy on an opponent whose hand is not known yet, scaled by how close they are to finishing. */
  spyInfo: number;
  /**
   * Per expected card the next player has to draw because they cannot follow the new top card,
   * scaled by how close they are to finishing. Estimated from the unseen cards, the known cards,
   * and what their earlier draws revealed (`HandConstraint`).
   */
  block: number;
}

/**
 * Tuned with `tools/simulate/tune.ts` against rule-based bots (docs/03 section 4). Attacks and Spy
 * information turned out to be worth nothing beyond the turns they save, so their weights are 0.
 */
export const DEFAULT_HEURISTIC_WEIGHTS: HeuristicWeights = {
  turns: -15,
  handGrowth: -1.875,
  followUp: 6,
  reserve: 3.75,
  pressure: 0,
  swapGiven: -1.2,
  spyInfo: 0,
  block: 4
};

/**
 * The level-3 bot: the tuned weights without blocking, so it does not use the inferences about the
 * opponents' hands; that knowledge stays the sampling bot's advantage. With blocking, level 3 was
 * nearly as close to level 4 as to level 2 (docs/05, entry 18). The sampling bot still pre-selects
 * its candidates with the full `DEFAULT_HEURISTIC_WEIGHTS`.
 */
export const LEVEL_3_WEIGHTS: HeuristicWeights = { ...DEFAULT_HEURISTIC_WEIGHTS, block: 0 };

/** Bonus for emptying the hand, which ends the bot's match as a finisher (R20). */
const FINISH_BONUS = 1_000;
const STORM_EXPECTED = (STORM_MIN + STORM_MAX) / 2;
/** Expected extra turns for one unknown card drawn or received: it often starts a new group. */
const UNKNOWN_CARD_TURNS = 0.8;

export function createHeuristicBot(weights: HeuristicWeights): Bot {
  return {
    level: "heuristic",
    decide: ({ view, memory, actions }) => {
      const context = evaluationContext(view, memory);
      let bestAction = actions[0];
      let bestScore = -Infinity;
      for (const action of actions) {
        const score = scoreAction(view, memory, action, weights, context);
        if (score > bestScore) {
          bestAction = action;
          bestScore = score;
        }
      }
      return bestAction;
    }
  };
}

/** What the bot knows about the hidden cards, computed once per decision. */
export interface EvaluationContext {
  /** Unseen cards that are not known to be in any hand. */
  pool: Card[];
}

export function evaluationContext(view: PlayerMatchView, memory: BotMemory | null): EvaluationContext | null {
  if (memory === null) {
    return null;
  }
  const known = new Set(view.players.flatMap((player) => memory.knownCards(player.userId)).map((card) => card.id));
  return { pool: memory.unseenCards(view.hand).filter((card) => !known.has(card.id)) };
}

/** Weighted evaluation of the bot's situation right after `action`. */
export function scoreAction(
  view: PlayerMatchView,
  memory: BotMemory | null,
  action: LegalAction,
  weights: HeuristicWeights,
  context: EvaluationContext | null = evaluationContext(view, memory)
): number {
  if (!isPlay(action)) {
    // Draw: the hand grows, the table stays as it is.
    const growth = action.option === "penalty" ? view.pendingPenalty : action.option === "draw" ? 1 : 0;
    return (
      weights.turns * growth * UNKNOWN_CARD_TURNS +
      weights.handGrowth * growth +
      weights.reserve * reserveCount(view.hand) +
      weights.followUp * followUpShare(view.hand, view)
    );
  }

  const rest = remainingHand(view, action);
  if (rest.length === 0 && action.swapCardId === undefined) {
    return FINISH_BONUS;
  }

  const last = lastCard(view, action);
  // A Swap gives one card away and receives one, so the hand size does not change.
  const growth = -action.cardIds.length + (action.swapCardId === undefined ? 0 : 1);
  const nextTable = {
    topCard: last,
    activeColor: action.chosenColor ?? null,
    pendingPenalty: 0
  };

  // A Swap brings in one unknown card.
  const turnsAfter = turnsNeeded(rest) + (action.swapCardId === undefined ? 0 : UNKNOWN_CARD_TURNS);
  let score =
    weights.turns * (turnsAfter - turnsNeeded(view.hand)) +
    weights.handGrowth * growth +
    weights.followUp * followUpShare(rest, nextTable) +
    weights.reserve * reserveCount(rest);

  const next = nextPlayer(view);
  if (next && memory !== null && context !== null && weights.block !== 0) {
    const penalty = last.kind === "plus2" ? view.pendingPenalty + 2 : 0;
    const table = { ...nextTable, pendingPenalty: penalty };
    const cardsToDraw = penalty > 0 ? penalty : 1;
    score += weights.block * blockChance(memory, context, next, table) * cardsToDraw * danger(next);
  }

  switch (last.kind) {
    case "plus2": {
      // While a penalty is active this +2 also saves the bot from drawing it.
      if (view.pendingPenalty > 0) {
        score -= weights.handGrowth * view.pendingPenalty;
      }
      if (next) {
        const hasNoPlus2 = memory !== null && knownWithoutPlus2(memory, next.userId);
        score += weights.pressure * (view.pendingPenalty + 2) * danger(next) * (hasNoPlus2 ? 1.5 : 1);
      }
      break;
    }
    case "storm":
      for (const opponent of opponents(view)) {
        score += weights.pressure * STORM_EXPECTED * danger(opponent);
      }
      break;
    case "swap":
      if (action.swapCardId !== undefined) {
        const given = view.hand.find((card) => card.id === action.swapCardId)!;
        score += weights.swapGiven * keepValue(given, rest);
      }
      break;
    case "spy": {
      const target = view.players.find((player) => player.userId === action.targetPlayerId)!;
      const alreadyKnown = memory !== null && memory.knownCards(target.userId).length >= target.handSize;
      if (!alreadyKnown) {
        score += weights.spyInfo * danger(target);
      }
      break;
    }
  }

  return score;
}

/**
 * Probability that `player` holds no card to play on `table`. Their known cards are checked
 * directly; each unknown card is assumed to be a random unseen card, except that the cards covered
 * by their strongest inference are random cards that did not fit the table they drew on.
 */
export function blockChance(
  memory: BotMemory,
  context: EvaluationContext,
  player: PublicPlayerView,
  table: Parameters<typeof isPlayableOn>[1]
): number {
  const known = memory.knownCards(player.userId);
  if (known.some((card) => isPlayableOn(card, table))) {
    return 0;
  }
  const unknown = Math.max(0, player.handSize - known.length);
  const fits = (cards: readonly Card[]) =>
    cards.length === 0 ? 0 : cards.filter((card) => isPlayableOn(card, table)).length / cards.length;

  const constraint = [...memory.constraintsOf(player.userId)].sort((a, b) => b.remaining - a.remaining)[0];
  const covered = constraint ? Math.min(constraint.remaining, unknown) : 0;
  const coveredFit = constraint ? fits(context.pool.filter((card) => !isPlayableOn(card, constraint.context))) : 0;
  return (1 - coveredFit) ** covered * (1 - fits(context.pool)) ** (unknown - covered);
}

/** Share of `hand` playable on the given table, 0 for an empty hand. */
function followUpShare(hand: readonly Card[], table: Parameters<typeof isPlayableOn>[1]): number {
  if (hand.length === 0) {
    return 0;
  }
  return hand.filter((card) => isPlayableOn(card, table)).length / hand.length;
}

function reserveCount(hand: readonly Card[]): number {
  return hand.filter((card) => card.kind === "plus2" || card.kind === "storm" || card.kind === "colorChange").length;
}

/** Grows as an opponent gets close to finishing: 1 at 7 cards, about 3.6 at 1 card. */
function danger(player: PublicPlayerView): number {
  return 1 + 3 / Math.max(1, player.handSize) - 3 / 7;
}

/** Whether the bot knows the player's whole hand and it contains no +2. */
function knownWithoutPlus2(memory: BotMemory, userId: string): boolean {
  const view = memory.view;
  const player = view?.players.find((candidate) => candidate.userId === userId);
  const known = memory.knownCards(userId);
  return player !== undefined && known.length >= player.handSize && !known.some((card) => card.kind === "plus2");
}
