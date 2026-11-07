// Legal plays (R4–R9, R15–R17) computed from a player's own view. The engine uses the same rule
// predicates (`isPlayableOn`, `isValidTarget`, `isCardLegal`, `drawOptionFor`), so clients and the
// server always agree; the server still validates every action.

import { HAND_LIMIT } from "./constants.js";
import { isColoredCard, isNumberCard, isWildCard, type Card, type CardColor } from "./cards.js";
import type { MatchStatus, Presence } from "./status.js";
import type { PlayerMatchView } from "./views.js";

export interface PlayableContext {
  topCard: Card;
  /** Color chosen by Color Change (R6). */
  activeColor: CardColor | null;
  /** Accumulated +2 penalty (R7). */
  pendingPenalty: number;
}

/** Whether a single card may be played on the top card, ignoring Swap and Spy targets (R4–R7, R9). */
export function isPlayableOn(card: Card, context: PlayableContext): boolean {
  const { topCard: top, activeColor, pendingPenalty } = context;

  // R7
  if (pendingPenalty > 0) {
    return card.kind === "plus2";
  }

  // R9
  if (isWildCard(card)) {
    return true;
  }

  // R5
  if (top.kind === "storm" || top.kind === "spy") {
    return true;
  }

  // R6
  if (top.kind === "colorChange") {
    return isColoredCard(card) && card.color === activeColor;
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

/**
 * Whether `candidate` can be targeted by `actorId` with Swap or Spy: another active, connected
 * player (R12, R14, R23). Used by the engine and by the client hints.
 */
export function isValidTarget(
  candidate: { userId: string; matchStatus: MatchStatus; presence: Presence },
  actorId: string
): boolean {
  return candidate.userId !== actorId && candidate.matchStatus === "active" && candidate.presence === "connected";
}

/** Whether a card can be played now, including the Swap and Spy target requirement (R4–R9). */
export function isCardLegal(card: Card, context: PlayableContext, hasValidTarget: boolean): boolean {
  return isPlayableOn(card, context) && ((card.kind !== "swap" && card.kind !== "spy") || hasValidTarget);
}

/** Whether the viewer may act now: the match is running and it is their turn. */
export function isViewersTurn(view: PlayerMatchView): boolean {
  return view.phase === "awaiting_action" && view.currentPlayerId === view.userId;
}

/** Players the viewer may target with Swap or Spy: other active, connected players (R12, R14, R23). */
export function getValidTargets(view: PlayerMatchView): PlayerMatchView["players"] {
  return view.players.filter((player) => isValidTarget(player, view.userId));
}

/** Cards of the viewer's hand that can start a play now; empty when it is not their turn. */
export function getLegalCards(view: PlayerMatchView): Card[] {
  if (!isViewersTurn(view)) {
    return [];
  }

  const hasTarget = getValidTargets(view).length > 0;
  return view.hand.filter((card) => isCardLegal(card, view, hasTarget));
}

/**
 * Cards that may be added to a combo started with `first` (R8): other number cards of the same
 * number, of any color. Empty for special cards, which cannot form combos (R9).
 */
export function getComboPartners(view: PlayerMatchView, first: Card): Card[] {
  if (!isNumberCard(first)) {
    return [];
  }
  return view.hand.filter((card) => card.id !== first.id && isNumberCard(card) && card.number === first.number);
}

/**
 * Cards the viewer may give away when playing `swapCard` (R12): every other card of their hand.
 * Empty when the Swap is their last card; the exchange is then skipped and the play carries no
 * Swap selection.
 */
export function getSwapOffers(view: PlayerMatchView, swapCard: Card): Card[] {
  return view.hand.filter((card) => card.id !== swapCard.id);
}

export type DrawOption = "penalty" | "draw" | "pass";

/**
 * What `game:draw` does for the player on turn (R10, R15, R17): take the +2 penalty, draw one
 * card, or pass at 20 cards without a legal card. `null` when they hold 20 cards and must play a
 * legal card. Used by the engine and by `getDrawOption`.
 */
export function drawOptionFor(situation: {
  pendingPenalty: number;
  handSize: number;
  hasLegalCard: boolean;
}): DrawOption | null {
  if (situation.pendingPenalty > 0) {
    return "penalty";
  }
  if (situation.handSize < HAND_LIMIT) {
    return "draw";
  }
  return situation.hasLegalCard ? null : "pass";
}

/**
 * What `game:draw` does for the viewer now (R10, R15, R17). `null` when drawing is not allowed:
 * it is not their turn, or they hold 20 cards and must play a legal card.
 */
export function getDrawOption(view: PlayerMatchView): DrawOption | null {
  if (!isViewersTurn(view)) {
    return null;
  }
  return drawOptionFor({
    pendingPenalty: view.pendingPenalty,
    handSize: view.hand.length,
    hasLegalCard: getLegalCards(view).length > 0
  });
}
