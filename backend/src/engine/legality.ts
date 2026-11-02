// Legal plays (R4–R9). The single-card rule is shared with the clients (`isPlayableOn`).

import { isPlayableOn, type Card } from "@wildhand/shared";
import { topCard, validTargets, type MatchPlayer, type MatchState } from "./state.js";

/** Whether a single card may be played on the current top card, ignoring Swap and Spy targets. */
export function isPlayable(card: Card, state: MatchState): boolean {
  return isPlayableOn(card, {
    topCard: topCard(state),
    activeColor: state.activeColor,
    pendingPenalty: state.pendingPenalty
  });
}

/** Whether a card can be played now, including the Swap and Spy target requirement (R9). */
export function isLegalCard(card: Card, state: MatchState, actorId: string): boolean {
  if (!isPlayable(card, state)) {
    return false;
  }

  if (card.kind === "swap" || card.kind === "spy") {
    return validTargets(state, actorId).length > 0;
  }

  return true;
}

export function hasLegalCard(state: MatchState, player: MatchPlayer): boolean {
  return player.hand.some((card) => isLegalCard(card, state, player.userId));
}
