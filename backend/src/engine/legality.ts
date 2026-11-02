// Legal plays (R4–R9).

import { isColoredCard, isNumberCard, isWildCard, type Card } from "@wildhand/shared";
import { topCard, validTargets, type MatchPlayer, type MatchState } from "./state.js";

/** Whether a single card may be played on the current top card, ignoring Swap and Spy targets. */
export function isPlayable(card: Card, state: MatchState): boolean {
  // R7
  if (state.pendingPenalty > 0) {
    return card.kind === "plus2";
  }

  // R9
  if (isWildCard(card)) {
    return true;
  }

  const top = topCard(state);

  // R5
  if (top.kind === "storm" || top.kind === "spy") {
    return true;
  }

  // R6
  if (top.kind === "colorChange") {
    return isColoredCard(card) && card.color === state.activeColor;
  }

  // R4
  if (!isColoredCard(top) || !isColoredCard(card)) {
    return false;
  }

  if (card.color === top.color) {
    return true;
  }

  if (isNumberCard(card) && isNumberCard(top)) {
    return card.number === top.number;
  }

  return card.kind === top.kind;
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
