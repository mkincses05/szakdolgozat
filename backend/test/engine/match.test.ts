import { describe, expect, it } from "vitest";
import { applyDraw, applyForfeit, applyPlay, setPresence } from "../../src/engine/actions.js";
import { getMatchResults } from "../../src/engine/turn.js";
import { toMatchView } from "../../src/engine/views.js";
import { buildState, expectOk, fixedRng, hand, num, player, plus2, unplayable } from "./helpers.js";

const rng = fixedRng(0);

describe("match end (R21)", () => {
  it("ends when one active player remains; that player takes the last position", () => {
    const last = num("red", 3);
    const state = buildState({ hands: [unplayable(3), [last], unplayable(3)], top: num("red", 2), current: 1 });
    state.players[0].matchStatus = "finished";
    state.players[0].finishPosition = 1;
    state.finishingOrder = ["p0"];

    const result = expectOk(applyPlay(state, "p1", { cardIds: [last.id] }, rng));

    expect(result.state.phase).toBe("ended");
    expect(result.state.currentPlayerId).toBeNull();
    expect(getMatchResults(result.state)).toEqual({
      matchId: "match-1",
      endReason: "last_player",
      winnerId: "p0",
      standings: [
        { userId: "p0", position: 1, matchStatus: "finished" },
        { userId: "p1", position: 2, matchStatus: "finished" },
        { userId: "p2", position: 3, matchStatus: "finished" }
      ]
    });
  });

  it("discards a pending penalty when a last-card +2 ends the match", () => {
    const lastPlus2 = plus2("red");
    const state = buildState({ hands: [[lastPlus2], unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyPlay(state, "p0", { cardIds: [lastPlus2.id] }, rng));

    expect(result.state.phase).toBe("ended");
    expect(result.state.pendingPenalty).toBe(0);
    expect(hand(result.state, "p1")).toHaveLength(3);
  });

  it("accepts no further actions after the match has ended", () => {
    const last = num("red", 3);
    const state = buildState({ hands: [[last], unplayable(3)], top: num("red", 2) });
    const ended = expectOk(applyPlay(state, "p0", { cardIds: [last.id] }, rng)).state;
    expect(applyDraw(ended, "p1", rng)).toEqual({ ok: false, code: "match_not_running" });
    expect(applyForfeit(ended, "p1", rng)).toEqual({ ok: false, code: "match_not_running" });
  });
});

describe("forfeit (R23)", () => {
  it("removes the hand from play and ends the match when one active player remains", () => {
    const forfeitedHand = unplayable(4);
    const state = buildState({ hands: [unplayable(3), forfeitedHand], top: num("red", 2) });
    const result = expectOk(applyForfeit(state, "p1", rng));

    expect(result.state.removedCards).toEqual(forfeitedHand);
    expect(hand(result.state, "p1")).toEqual([]);
    expect(result.effects).toEqual([{ type: "playerForfeited", userId: "p1" }]);
    expect(getMatchResults(result.state)).toMatchObject({
      endReason: "forfeits",
      winnerId: "p0",
      standings: [
        { userId: "p0", position: 1, matchStatus: "finished" },
        { userId: "p1", position: 2, matchStatus: "forfeited" }
      ]
    });
  });

  it("ranks forfeited players below everyone else, later forfeits above earlier ones", () => {
    let state = buildState({ hands: [unplayable(3), unplayable(3), unplayable(3), unplayable(3)], top: num("red", 2) });
    state = expectOk(applyForfeit(state, "p1", rng)).state;
    state = expectOk(applyForfeit(state, "p2", rng)).state;
    expect(state.phase).toBe("awaiting_action");
    state = expectOk(applyForfeit(state, "p0", rng)).state;

    expect(getMatchResults(state)?.standings.map((standing) => [standing.userId, standing.position])).toEqual([
      ["p3", 1],
      ["p0", 2],
      ["p2", 3],
      ["p1", 4]
    ]);
  });

  it("passes the turn on when the current player forfeits", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3), unplayable(3)], top: num("red", 2) });
    expect(expectOk(applyForfeit(state, "p0", rng)).state.currentPlayerId).toBe("p1");
  });
});

describe("turn order and presence (R23)", () => {
  it("skips finished, forfeited, and disconnected players", () => {
    const state = buildState({
      hands: [unplayable(3), unplayable(3), unplayable(3), unplayable(3), unplayable(3)],
      top: num("red", 2),
      presence: ["connected", "connected", "connected", "disconnected", "connected"]
    });
    state.players[1].matchStatus = "finished";
    state.players[2].matchStatus = "forfeited";

    expect(expectOk(applyDraw(state, "p0", rng)).state.currentPlayerId).toBe("p4");
  });

  it("a player who disconnects during their turn keeps it", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3)], top: num("red", 2) });
    const result = expectOk(setPresence(state, "p0", "disconnected"));
    expect(result.state.currentPlayerId).toBe("p0");
  });

  it("waits for a reconnect when no active player is connected", () => {
    let state = buildState({
      hands: [unplayable(3), unplayable(3), unplayable(3)],
      top: num("red", 2),
      presence: ["connected", "disconnected", "disconnected"]
    });
    state = expectOk(setPresence(state, "p0", "disconnected")).state;
    state = expectOk(applyDraw(state, "p0", rng)).state;
    expect(state.currentPlayerId).toBeNull();

    const version = state.stateVersion;
    state = expectOk(setPresence(state, "p2", "connected")).state;
    expect(state.currentPlayerId).toBe("p2");
    // Handing over the turn is a new version.
    expect(state.stateVersion).toBe(version + 1);
  });

  it("a presence change that leaves the turn as it was keeps the state version", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3), unplayable(3)], top: num("red", 2) });
    const disconnected = expectOk(setPresence(state, "p1", "disconnected")).state;
    expect(disconnected.players[1].presence).toBe("disconnected");
    expect(disconnected.stateVersion).toBe(state.stateVersion);
    expect(expectOk(setPresence(disconnected, "p1", "connected")).state.stateVersion).toBe(state.stateVersion);
  });
});

describe("validation and versioning", () => {
  it("rejects actions from other players and leaves the state unchanged", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3)], top: num("red", 2) });
    const snapshot = structuredClone(state);

    expect(applyDraw(state, "p1", rng)).toEqual({ ok: false, code: "not_your_turn" });
    expect(applyDraw(state, "nobody", rng)).toEqual({ ok: false, code: "not_in_match" });
    expect(applyPlay(state, "p0", { cardIds: [hand(state, "p0")[0].id] }, rng)).toEqual({
      ok: false,
      code: "illegal_card"
    });
    expect(state).toEqual(snapshot);
  });

  it("rejects actions from players who are not active", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3), unplayable(3)], top: num("red", 2) });
    state.players[0].matchStatus = "finished";
    expect(applyDraw(state, "p0", rng)).toEqual({ ok: false, code: "player_not_active" });
  });

  it("increments the state version exactly once per accepted action without mutating the input", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyDraw(state, "p0", rng));
    expect(result.state.stateVersion).toBe(1);
    expect(state.stateVersion).toBe(0);
    expect(hand(state, "p0")).toHaveLength(3);
  });
});

describe("views (R25)", () => {
  const context = { displayName: (userId: string) => `Name ${userId}`, turnDeadline: 1234, serverTime: 1000 };

  it("a player sees only their own hand; others see hand sizes", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(4)], top: num("red", 2) });
    const view = toMatchView(state, "p0", context);

    expect(view).toMatchObject({ viewer: "player", userId: "p0", hand: hand(state, "p0"), turnDeadline: 1234, serverTime: 1000 });
    expect(view.players.map((entry) => entry.handSize)).toEqual([3, 4]);
    for (const card of hand(state, "p1")) {
      expect(JSON.stringify(view)).not.toContain(card.id);
    }
  });

  it("spectators and forfeited players receive no hand", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(4), unplayable(2)], top: num("red", 2) });
    player(state, "p2").matchStatus = "forfeited";

    for (const viewerId of [null, "outsider", "p2"]) {
      const view = toMatchView(state, viewerId, context);
      expect(view.viewer).toBe("spectator");
      expect("hand" in view).toBe(false);
      for (const card of state.players.flatMap((entry) => entry.hand)) {
        expect(JSON.stringify(view)).not.toContain(card.id);
      }
    }
  });
});
