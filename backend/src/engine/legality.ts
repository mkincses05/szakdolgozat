// Legal plays (R4–R9). The rules are the shared predicates the clients use for their hints
// (`isPlayableOn`, `isCardLegal`), applied to the authoritative state.

import { isCardLegal, isPlayableOn, type Card } from "@wildhand/shared";
import { topCard, validTargets, type MatchPlayer, type MatchState } from "./state.js";

function playableContext(state: MatchState) {
  return { topCard: topCard(state), activeColor: state.activeColor, pendingPenalty: state.pendingPenalty };
}

/** Whether a single card may be played on the current top card, ignoring Swap and Spy targets. */
export function isPlayable(card: Card, state: MatchState): boolean {
  return isPlayableOn(card, playableContext(state));
}

/** Whether a card can be played now, including the Swap and Spy target requirement (R9). */
export function isLegalCard(card: Card, state: MatchState, actorId: string): boolean {
  return isCardLegal(card, playableContext(state), validTargets(state, actorId).length > 0);
}

export function hasLegalCard(state: MatchState, player: MatchPlayer): boolean {
  const context = playableContext(state);
  const hasTarget = validTargets(state, player.userId).length > 0;
  return player.hand.some((card) => isCardLegal(card, context, hasTarget));
}
