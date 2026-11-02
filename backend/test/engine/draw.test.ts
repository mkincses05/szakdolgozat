import { describe, expect, it } from "vitest";
import { DECK_SIZE } from "@wildhand/shared";
import { applyDraw, applyPlay, applyTimeout } from "../../src/engine/actions.js";
import { topCard } from "../../src/engine/state.js";
import { buildState, expectOk, fixedRng, hand, num, storm, unplayable } from "./helpers.js";

const rng = fixedRng(0);

describe("drawing (R15)", () => {
  it("a player may draw while holding a legal card; drawing ends the turn", () => {
    const legal = num("red", 3);
    const state = buildState({ hands: [[legal], unplayable(3)], top: num("red", 2) });

    const result = expectOk(applyDraw(state, "p0", rng));

    expect(hand(result.state, "p0")).toHaveLength(2);
    expect(result.effects).toEqual([{ type: "cardDrawn", draw: { userId: "p0", requested: 1, actual: 1 } }]);
    expect(result.state.currentPlayerId).toBe("p1");
  });

  it("the drawn card cannot be played in the same turn", () => {
    const playable = num("red", 9);
    const state = buildState({ hands: [unplayable(2), unplayable(3)], top: num("red", 2), drawPile: [playable] });
    const drawn = expectOk(applyDraw(state, "p0", rng)).state;
    expect(applyPlay(drawn, "p0", { cardIds: [playable.id] }, rng)).toEqual({ ok: false, code: "not_your_turn" });
  });
});

describe("hand limit (R16, R17)", () => {
  it("a player at 20 cards cannot draw voluntarily while holding a legal card", () => {
    const state = buildState({ hands: [[...unplayable(19), num("red", 3)], unplayable(3)], top: num("red", 2) });
    expect(applyDraw(state, "p0", rng)).toEqual({ ok: false, code: "hand_limit_reached" });
  });

  it("a player at 20 cards without a legal card passes without drawing", () => {
    const state = buildState({ hands: [unplayable(20), unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyDraw(state, "p0", rng));
    expect(result.effects).toEqual([{ type: "passed", userId: "p0" }]);
    expect(hand(result.state, "p0")).toHaveLength(20);
    expect(result.state.currentPlayerId).toBe("p1");
  });
});

describe("blocked game (R18)", () => {
  it("ends the match when every active player holds 20 cards without a legal card", () => {
    const state = buildState({ hands: [unplayable(20), unplayable(20), unplayable(20)], top: num("red", 2) });
    const result = expectOk(applyDraw(state, "p0", rng));

    expect(result.state.phase).toBe("ended");
    expect(result.state.endReason).toBe("blocked");
    expect(result.state.currentPlayerId).toBeNull();
    expect(result.state.players.map((player) => player.finishPosition)).toEqual([1, 1, 1]);
  });

  it("is not blocked while one player can still draw", () => {
    const state = buildState({ hands: [unplayable(20), unplayable(19)], top: num("red", 2) });
    expect(expectOk(applyDraw(state, "p0", rng)).state.phase).toBe("awaiting_action");
  });

  it("finished players keep their positions; the blocked players share the next one", () => {
    const state = buildState({ hands: [unplayable(20), unplayable(20), []], top: num("red", 2) });
    state.players[2].matchStatus = "finished";
    state.players[2].finishPosition = 1;
    state.finishingOrder = ["p2"];

    const result = expectOk(applyDraw(state, "p0", rng));
    expect(result.state.players.map((player) => player.finishPosition)).toEqual([2, 2, 1]);
  });
});

describe("turn timer (R22)", () => {
  it("draws one card on timeout even with a legal card", () => {
    const state = buildState({ hands: [[num("red", 3)], unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyTimeout(state, "p0", rng));
    expect(hand(result.state, "p0")).toHaveLength(2);
    expect(result.state.currentPlayerId).toBe("p1");
  });

  it("passes on timeout at 20 cards even with a legal card", () => {
    const state = buildState({ hands: [[...unplayable(19), num("red", 3)], unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyTimeout(state, "p0", rng));
    expect(result.effects).toEqual([{ type: "passed", userId: "p0" }]);
  });

  it("draws the pending penalty on timeout", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3)], top: num("red", 2), pendingPenalty: 4 });
    const result = expectOk(applyTimeout(state, "p0", rng));
    expect(hand(result.state, "p0")).toHaveLength(7);
    expect(result.state.pendingPenalty).toBe(0);
  });
});

describe("draw-pile recycling (R19)", () => {
  it("reshuffles more than 25 reusable cards without adding a deck, keeping the top card", () => {
    const top = num("red", 2);
    const below = unplayable(26);
    const state = buildState({ hands: [unplayable(3), unplayable(3)], top, discardBelow: below, drawPile: [] });

    const result = expectOk(applyDraw(state, "p0", rng));

    expect(result.effects[0]).toEqual({ type: "reshuffle", reusedCards: 26, deckAdded: false, decksInPlay: 1 });
    expect(result.state.discardPile).toEqual([top]);
    expect(result.state.drawPile).toHaveLength(25);
    expect(result.state.decksInPlay).toBe(1);
  });

  it("adds a new 104-card deck when 25 or fewer cards are reusable", () => {
    const state = buildState({
      hands: [unplayable(3), unplayable(3)],
      top: num("red", 2),
      discardBelow: unplayable(25),
      drawPile: []
    });

    const result = expectOk(applyDraw(state, "p0", rng));

    expect(result.effects[0]).toEqual({ type: "reshuffle", reusedCards: 25, deckAdded: true, decksInPlay: 2 });
    expect(result.state.drawPile).toHaveLength(25 + DECK_SIZE - 1);
    const secondDeck = [...result.state.drawPile, ...hand(result.state, "p0")].filter((card) => card.deckInstance === 2);
    expect(secondDeck).toHaveLength(DECK_SIZE);
    expect(new Set(secondDeck.map((card) => card.id)).size).toBe(DECK_SIZE);
    expect(topCard(result.state)).toEqual(topCard(state));
  });

  it("reshuffles in the middle of a Storm and completes every draw", () => {
    const stormCard = storm();
    const state = buildState({
      hands: [[stormCard, num("red", 1)], unplayable(3), unplayable(3)],
      top: num("red", 2),
      discardBelow: unplayable(30),
      drawPile: unplayable(2)
    });

    const result = expectOk(applyPlay(state, "p0", { cardIds: [stormCard.id] }, fixedRng(3)));
    const types = result.effects.map((effect) => effect.type);

    expect(types).toEqual(["cardsPlayed", "reshuffle", "storm"]);
    expect(hand(result.state, "p1")).toHaveLength(6);
    expect(hand(result.state, "p2")).toHaveLength(6);
    expect(topCard(result.state)).toEqual(stormCard);
  });
});
