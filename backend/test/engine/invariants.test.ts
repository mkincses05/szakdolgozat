// Seeded randomized simulations (docs/01, section 5, invariant tests). The driver only picks random
// legal actions; it is a test helper, not a bot.

import { describe, expect, it } from "vitest";
import {
  CARD_COLORS,
  DECK_SIZE,
  HAND_LIMIT,
  getLegalCards,
  isNumberCard,
  type PlayerMatchView
} from "@wildhand/shared";
import { applyDraw, applyForfeit, applyPlay, applyTimeout, setPresence } from "../../src/engine/actions.js";
import { isLegalCard } from "../../src/engine/legality.js";
import { createSeededRng, type Rng } from "../../src/engine/rng.js";
import { createMatch } from "../../src/engine/setup.js";
import { findPlayer, validTargets, type EngineResult, type MatchState, type PlayAction } from "../../src/engine/state.js";
import { toMatchView } from "../../src/engine/views.js";

const MAX_ACTIONS = 20_000;
/** A simulation takes about 2 s; the default 5 s limit is too tight when the machine is busy. */
const SIMULATION_TIMEOUT_MS = 30_000;

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[rng.nextInt(0, items.length - 1)];
}

function randomPlay(state: MatchState, userId: string, rng: Rng): PlayAction | null {
  const player = findPlayer(state, userId)!;
  const legal = player.hand.filter((card) => isLegalCard(card, state, userId));
  if (legal.length === 0) {
    return null;
  }

  const first = pick(legal, rng);
  const action: PlayAction = { cardIds: [first.id] };

  if (isNumberCard(first)) {
    for (const card of player.hand) {
      if (card !== first && isNumberCard(card) && card.number === first.number && rng.nextInt(0, 1) === 1) {
        action.cardIds.push(card.id);
      }
    }
  }

  if (first.kind === "colorChange") {
    action.chosenColor = pick(CARD_COLORS, rng);
  }

  if (first.kind === "swap" || first.kind === "spy") {
    const target = pick(validTargets(state, userId), rng);
    action.targetPlayerId = target.userId;

    if (first.kind === "swap" && player.hand.length > 1) {
      action.swapCardId = pick(
        player.hand.filter((card) => card !== first),
        rng
      ).id;
      action.targetCardPosition = rng.nextInt(0, target.hand.length - 1);
    }
  }

  return action;
}

function step(state: MatchState, rng: Rng): EngineResult {
  const roll = rng.nextInt(0, 999);
  const active = state.players.filter((player) => player.matchStatus === "active");

  if (roll < 3) {
    return applyForfeit(state, pick(active, rng).userId, rng);
  }

  if (roll < 15) {
    const target = pick(active, rng);
    return setPresence(state, target.userId, target.presence === "connected" ? "disconnected" : "connected");
  }

  if (state.currentPlayerId === null) {
    return setPresence(state, pick(active, rng).userId, "connected");
  }

  const userId = state.currentPlayerId;
  if (roll < 30) {
    return applyTimeout(state, userId, rng);
  }

  const play = roll < 900 ? randomPlay(state, userId, rng) : null;
  if (play) {
    return applyPlay(state, userId, play, rng);
  }

  const player = findPlayer(state, userId)!;
  const mustPlay =
    state.pendingPenalty === 0 &&
    player.hand.length >= HAND_LIMIT &&
    player.hand.some((card) => isLegalCard(card, state, userId));
  return mustPlay ? applyPlay(state, userId, randomPlay(state, userId, rng)!, rng) : applyDraw(state, userId, rng);
}

function checkInvariants(before: MatchState, result: EngineResult): void {
  if (!result.ok) {
    throw new Error(`driver produced a rejected action: ${result.code}`);
  }

  const { state, effects } = result;
  const allCards = [
    ...state.drawPile,
    ...state.discardPile,
    ...state.removedCards,
    ...state.players.flatMap((player) => player.hand)
  ];

  expect(allCards).toHaveLength(DECK_SIZE * state.decksInPlay);
  expect(new Set(allCards.map((card) => card.id)).size).toBe(allCards.length);

  for (const player of state.players) {
    expect(player.hand.length).toBeLessThanOrEqual(HAND_LIMIT);
    if (player.matchStatus !== "active") {
      expect(player.hand.length === 0 || player.matchStatus === "finished").toBe(true);
    }
  }

  if (state.currentPlayerId !== null) {
    expect(state.phase).toBe("awaiting_action");
    expect(findPlayer(state, state.currentPlayerId)!.matchStatus).toBe("active");
  }

  for (const effect of effects) {
    if (effect.type === "swap" || effect.type === "spy") {
      const target = findPlayer(before, effect.targetId)!;
      expect(target.matchStatus).toBe("active");
      expect(target.presence).toBe("connected");
    }
    if (effect.type === "storm") {
      expect(new Set(effect.draws.map((draw) => draw.requested))).toEqual(new Set([effect.value]));
      for (const draw of effect.draws) {
        expect(findPlayer(before, draw.userId)!.matchStatus).toBe("active");
      }
    }
  }

  // The legal cards computed by clients from their own view match the engine's.
  if (state.currentPlayerId !== null) {
    const view = toMatchView(state, state.currentPlayerId, { displayName: (id) => id, turnDeadline: null, serverTime: 0 });
    const engineLegal = findPlayer(state, state.currentPlayerId)!.hand.filter((card) =>
      isLegalCard(card, state, state.currentPlayerId!)
    );
    expect(getLegalCards(view as PlayerMatchView)).toEqual(engineLegal);
  }

  if (state.phase === "ended") {
    expect(state.currentPlayerId).toBeNull();
    expect(state.pendingPenalty).toBe(0);
    expect(state.players.every((player) => player.finishPosition !== null)).toBe(true);
  }

  expect(state.stateVersion).toBeGreaterThanOrEqual(before.stateVersion);
}

function simulate(seed: number, playerCount: number): { state: MatchState; actions: number } {
  const rng = createSeededRng(seed);
  const userIds = Array.from({ length: playerCount }, (_, index) => `p${index}`);
  const created = createMatch({ matchId: `m${seed}`, userIds }, rng);
  if (!created.ok) {
    throw new Error(created.code);
  }

  let state = created.state;
  let actions = 0;

  while (state.phase !== "ended" && actions < MAX_ACTIONS) {
    const result = step(state, rng);
    checkInvariants(state, result);
    if (result.ok) {
      state = result.state;
    }
    actions++;
  }

  return { state, actions };
}

describe("seeded randomized simulation", { timeout: SIMULATION_TIMEOUT_MS }, () => {
  for (let playerCount = 2; playerCount <= 8; playerCount++) {
    it(`keeps every invariant and always ends with ${playerCount} players`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const { state } = simulate(seed * 100 + playerCount, playerCount);
        expect(state.phase).toBe("ended");
      }
    });
  }

  it("produces the same match for the same seed", () => {
    expect(simulate(2024, 5)).toEqual(simulate(2024, 5));
  });
});
