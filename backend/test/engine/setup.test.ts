import { describe, expect, it } from "vitest";
import { DECK_SIZE, STARTING_HAND_SIZE, isNumberCard } from "@wildhand/shared";
import { createSeededRng } from "../../src/engine/rng.js";
import { createMatch } from "../../src/engine/setup.js";
import { topCard } from "../../src/engine/state.js";

const userIds = (count: number) => Array.from({ length: count }, (_, index) => `p${index}`);

describe("createMatch", () => {
  it("R1: accepts 2–8 players", () => {
    expect(createMatch({ matchId: "m", userIds: userIds(1) }, createSeededRng(1))).toEqual({
      ok: false,
      code: "not_enough_players"
    });
    expect(createMatch({ matchId: "m", userIds: userIds(9) }, createSeededRng(1))).toEqual({
      ok: false,
      code: "too_many_players"
    });
    expect(createMatch({ matchId: "m", userIds: userIds(2) }, createSeededRng(1)).ok).toBe(true);
    expect(createMatch({ matchId: "m", userIds: userIds(8) }, createSeededRng(1)).ok).toBe(true);
  });

  it("rejects duplicate players", () => {
    expect(createMatch({ matchId: "m", userIds: ["a", "a"] }, createSeededRng(1)).ok).toBe(false);
  });

  it("R3: deals 7 cards each and starts with a number card, for many seeds", () => {
    for (let seed = 0; seed < 300; seed++) {
      const result = createMatch({ matchId: "m", userIds: userIds(8) }, createSeededRng(seed));
      if (!result.ok) throw new Error(result.code);
      const { state } = result;

      for (const player of state.players) {
        expect(player.hand).toHaveLength(STARTING_HAND_SIZE);
      }
      expect(isNumberCard(topCard(state))).toBe(true);
      expect(state.discardPile).toHaveLength(1);
      expect(state.players.some((player) => player.userId === state.currentPlayerId)).toBe(true);

      const allCards = [...state.drawPile, ...state.discardPile, ...state.players.flatMap((player) => player.hand)];
      expect(new Set(allCards.map((card) => card.id)).size).toBe(DECK_SIZE);
    }
  });

  it("R3: the first player is random", () => {
    const firstPlayers = new Set<string | null>();
    for (let seed = 0; seed < 50; seed++) {
      const result = createMatch({ matchId: "m", userIds: userIds(4) }, createSeededRng(seed));
      if (result.ok) firstPlayers.add(result.state.currentPlayerId);
    }
    expect(firstPlayers.size).toBe(4);
  });

  it("R3, R23: the first player is never a disconnected member", () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = createMatch(
        { matchId: "m", userIds: userIds(4), disconnectedUserIds: ["p0", "p2"] },
        createSeededRng(seed)
      );
      if (!result.ok) throw new Error(result.code);
      expect(["p1", "p3"]).toContain(result.state.currentPlayerId);
      expect(result.state.players.map((player) => player.presence)).toEqual([
        "disconnected",
        "connected",
        "disconnected",
        "connected"
      ]);
    }
  });

  it("R23: without a connected player, nobody has the turn yet", () => {
    const result = createMatch(
      { matchId: "m", userIds: userIds(2), disconnectedUserIds: ["p0", "p1"] },
      createSeededRng(1)
    );
    expect(result.ok && result.state.currentPlayerId).toBeNull();
  });

  it("is deterministic for the same seed", () => {
    const first = createMatch({ matchId: "m", userIds: userIds(5) }, createSeededRng(42));
    const second = createMatch({ matchId: "m", userIds: userIds(5) }, createSeededRng(42));
    expect(first).toEqual(second);
  });
});
