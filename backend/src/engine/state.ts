// Authoritative runtime match state (docs/03, section 1). Room state, timers, and duplicate
// detection belong to the match service; the engine only knows the match itself.

import { isValidTarget } from "@wildhand/shared";
import type {
  Card,
  CardColor,
  ErrorCode,
  GameEffect,
  MatchEndReason,
  MatchPhase,
  MatchStatus,
  Presence,
  SpyReveal,
  SwapResult
} from "@wildhand/shared";

export interface MatchPlayer {
  userId: string;
  seat: number;
  /** Sent only to the owner (R25). */
  hand: Card[];
  matchStatus: MatchStatus;
  presence: Presence;
  finishPosition: number | null;
  isBot: boolean;
}

export interface MatchState {
  id: string;
  phase: MatchPhase;
  /** In seat order. */
  players: MatchPlayer[];
  /** `null` when the match has ended or no active player is connected (R23). */
  currentPlayerId: string | null;
  /** The last element is the top of the draw pile. */
  drawPile: Card[];
  /** The last element is the top card. */
  discardPile: Card[];
  /** Hands of forfeited players (R23). */
  removedCards: Card[];
  /** Color chosen by Color Change, cleared when the next card is played on it (R6). */
  activeColor: CardColor | null;
  /** Accumulated +2 penalty, 0 when none is active (R10). */
  pendingPenalty: number;
  decksInPlay: number;
  stateVersion: number;
  /** Finished players in finishing order (R20). */
  finishingOrder: string[];
  /** Forfeited players in forfeit order (R23). */
  forfeitOrder: string[];
  endReason: MatchEndReason | null;
}

/** Card selection of a `game:play` action (R8–R14). */
export interface PlayAction {
  cardIds: string[];
  chosenColor?: CardColor;
  targetPlayerId?: string;
  swapCardId?: string;
  targetCardPosition?: number;
}

/** Events that only one player may receive (R12, R14, R25). */
export type PrivateEvent =
  | { type: "spyReveal"; userId: string; reveal: SpyReveal }
  | { type: "swapResult"; userId: string; result: SwapResult };

/** Outcome of an engine action. On failure the input state is unchanged. */
export type EngineResult =
  | { ok: true; state: MatchState; effects: GameEffect[]; privateEvents: PrivateEvent[] }
  | { ok: false; code: ErrorCode };

export function findPlayer(state: MatchState, userId: string): MatchPlayer | undefined {
  return state.players.find((player) => player.userId === userId);
}

export function topCard(state: MatchState): Card {
  return state.discardPile[state.discardPile.length - 1];
}

export function activePlayers(state: MatchState): MatchPlayer[] {
  return state.players.filter((player) => player.matchStatus === "active");
}

/** Active, connected players other than the actor: valid Swap and Spy targets (R12, R14, R23). */
export function validTargets(state: MatchState, actorId: string): MatchPlayer[] {
  return state.players.filter((player) => isValidTarget(player, actorId));
}
