// Match setup (R1, R3).

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  STARTING_HAND_SIZE,
  createDeck,
  isNumberCard,
  type ErrorCode
} from "@wildhand/shared";
import { shuffle, type Rng } from "./rng.js";
import type { MatchPlayer, MatchState } from "./state.js";

export interface MatchSetup {
  matchId: string;
  /** User IDs in seat order. */
  userIds: string[];
  /** Members who are within their reconnect grace period when the match starts (R23). */
  disconnectedUserIds?: readonly string[];
}

export type CreateMatchResult = { ok: true; state: MatchState } | { ok: false; code: ErrorCode };

export function createMatch(setup: MatchSetup, rng: Rng): CreateMatchResult {
  const { matchId, userIds, disconnectedUserIds = [] } = setup;

  if (userIds.length < MIN_PLAYERS) {
    return { ok: false, code: "not_enough_players" };
  }

  if (userIds.length > MAX_PLAYERS) {
    return { ok: false, code: "too_many_players" };
  }

  if (new Set(userIds).size !== userIds.length) {
    return { ok: false, code: "invalid_payload" };
  }

  const drawPile = shuffle(createDeck(1), rng);
  const players: MatchPlayer[] = userIds.map((userId, seat) => ({
    userId,
    seat,
    hand: [],
    matchStatus: "active",
    presence: disconnectedUserIds.includes(userId) ? "disconnected" : "connected",
    finishPosition: null,
    isBot: false
  }));

  for (let round = 0; round < STARTING_HAND_SIZE; round++) {
    for (const player of players) {
      player.hand.push(drawPile.pop()!);
    }
  }

  // R3: a special starting card goes back to a random position of the draw pile, below the top.
  let startingCard = drawPile.pop()!;
  while (!isNumberCard(startingCard)) {
    drawPile.splice(rng.nextInt(0, drawPile.length - 1), 0, startingCard);
    startingCard = drawPile.pop()!;
  }

  // R3, R23: the first player is a random connected player. With nobody connected, the turn goes to
  // the first player who reconnects.
  const connected = players.filter((player) => player.presence === "connected");
  const firstPlayer = connected.length > 0 ? connected[rng.nextInt(0, connected.length - 1)] : null;

  return {
    ok: true,
    state: {
      id: matchId,
      phase: "awaiting_action",
      players,
      currentPlayerId: firstPlayer?.userId ?? null,
      drawPile,
      discardPile: [startingCard],
      removedCards: [],
      activeColor: null,
      pendingPenalty: 0,
      decksInPlay: 1,
      stateVersion: 0,
      finishingOrder: [],
      forfeitOrder: [],
      endReason: null
    }
  };
}
