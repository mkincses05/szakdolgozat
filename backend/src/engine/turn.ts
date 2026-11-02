// Turn resolution contract steps 5–6 (docs/01, section 6), blocked game (R18), and match end (R21).

import { HAND_LIMIT, type GameEffect, type MatchEndReason, type MatchResults, type Standing } from "@wildhand/shared";
import { drawCards } from "./draw.js";
import { hasLegalCard } from "./legality.js";
import type { Rng } from "./rng.js";
import { activePlayers, type MatchState } from "./state.js";

/**
 * Mutates `state`. Called after a turn, a forfeit, or another change of the active players:
 * ends the match (R18, R21) or selects the next player after `fromUserId`.
 */
export function completeTurn(
  state: MatchState,
  fromUserId: string,
  rng: Rng,
  effects: GameEffect[],
  endReason: MatchEndReason = "last_player"
): void {
  if (endMatchIfOver(state, endReason)) {
    return;
  }

  advanceTurn(state, fromUserId, rng, effects);

  // A penalty drawn for a disconnected player can block the game.
  endMatchIfOver(state, endReason);
}

/** Mutates `state`. Ends the match when one active player remains (R21) or the game is blocked (R18). */
export function endMatchIfOver(state: MatchState, endReason: MatchEndReason): boolean {
  if (activePlayers(state).length <= 1) {
    endMatch(state, endReason);
    return true;
  }

  if (isBlocked(state)) {
    endMatch(state, "blocked");
    return true;
  }

  return false;
}

/**
 * Selects the next active, connected player clockwise. A disconnected active player is selected
 * only to have a pending +2 penalty drawn for them (R10, R23). When no active player is connected,
 * no one has the turn until a player reconnects.
 */
function advanceTurn(state: MatchState, fromUserId: string, rng: Rng, effects: GameEffect[]): void {
  const count = state.players.length;
  const fromIndex = state.players.findIndex((player) => player.userId === fromUserId);
  state.currentPlayerId = null;

  for (let step = 1; step <= count; step++) {
    const player = state.players[(fromIndex + step) % count];

    if (player.matchStatus !== "active") {
      continue;
    }

    if (player.presence === "connected") {
      state.currentPlayerId = player.userId;
      return;
    }

    if (state.pendingPenalty > 0) {
      const draw = drawCards(state, player, state.pendingPenalty, rng, effects);
      state.pendingPenalty = 0;
      effects.push({ type: "penaltyDrawn", draw });
    }
  }
}

/** R18: every active player holds 20 cards and none has a legal card. */
export function isBlocked(state: MatchState): boolean {
  if (state.pendingPenalty > 0) {
    return false;
  }

  return activePlayers(state).every((player) => player.hand.length >= HAND_LIMIT && !hasLegalCard(state, player));
}

/**
 * Mutates `state`. Remaining active players share the next position; forfeited players rank below
 * them, later forfeits above earlier ones (R18, R21, R23). Positions use competition ranking.
 */
function endMatch(state: MatchState, reason: MatchEndReason): void {
  const remaining = activePlayers(state);
  const sharedPosition = state.finishingOrder.length + 1;

  for (const player of remaining) {
    player.matchStatus = "finished";
    player.finishPosition = sharedPosition;
    state.finishingOrder.push(player.userId);
  }

  const forfeitStart = state.finishingOrder.length + 1;
  [...state.forfeitOrder].reverse().forEach((userId, index) => {
    const player = state.players.find((candidate) => candidate.userId === userId)!;
    player.finishPosition = forfeitStart + index;
  });

  state.phase = "ended";
  state.currentPlayerId = null;
  state.pendingPenalty = 0;
  state.endReason = reason;
}

export function getMatchResults(state: MatchState): MatchResults | null {
  if (state.phase !== "ended" || state.endReason === null) {
    return null;
  }

  const standings: Standing[] = state.players
    .map((player) => ({
      userId: player.userId,
      position: player.finishPosition!,
      matchStatus: player.matchStatus,
      seat: player.seat
    }))
    .sort((a, b) => a.position - b.position || a.seat - b.seat)
    .map(({ seat: _seat, ...standing }) => standing);

  return { matchId: state.id, endReason: state.endReason, winnerId: standings[0].userId, standings };
}
