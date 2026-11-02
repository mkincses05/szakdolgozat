import { describe, expect, it } from "vitest";
import { applyDraw, applyForfeit, applyPlay } from "../../src/engine/actions.js";
import { createSeededRng, shuffle } from "../../src/engine/rng.js";
import { topCard } from "../../src/engine/state.js";
import {
  buildState,
  colorChange,
  expectOk,
  fixedRng,
  hand,
  num,
  player,
  plus2,
  spy,
  storm,
  swap,
  unplayable
} from "./helpers.js";

const rng = fixedRng(0);

describe("combos (R8, R9)", () => {
  it("accepts number cards with the same number; the last card becomes the top card", () => {
    const cards = [num("red", 7), num("blue", 7), num("green", 7)];
    const state = buildState({ hands: [[...cards, num("red", 1)], unplayable(3)], top: num("red", 2) });

    const result = expectOk(applyPlay(state, "p0", { cardIds: cards.map((card) => card.id) }, rng));

    expect(topCard(result.state)).toEqual(cards[2]);
    expect(hand(result.state, "p0")).toHaveLength(1);
    expect(result.state.currentPlayerId).toBe("p1");
  });

  it("rejects a combo whose first card is not playable", () => {
    const cards = [num("blue", 7), num("red", 7)];
    const state = buildState({ hands: [cards, unplayable(3)], top: num("red", 2) });
    expect(applyPlay(state, "p0", { cardIds: cards.map((card) => card.id) }, rng)).toEqual({
      ok: false,
      code: "illegal_card"
    });
  });

  it("rejects mixed numbers and special cards in a combo", () => {
    const red7 = num("red", 7);
    const blue8 = num("blue", 8);
    const redPlus2 = plus2("red");
    const bluePlus2 = plus2("blue");
    const state = buildState({ hands: [[red7, blue8, redPlus2, bluePlus2], unplayable(3)], top: num("red", 2) });

    expect(applyPlay(state, "p0", { cardIds: [red7.id, blue8.id] }, rng)).toEqual({ ok: false, code: "invalid_combo" });
    expect(applyPlay(state, "p0", { cardIds: [red7.id, redPlus2.id] }, rng)).toEqual({ ok: false, code: "invalid_combo" });
    expect(applyPlay(state, "p0", { cardIds: [redPlus2.id, bluePlus2.id] }, rng)).toEqual({
      ok: false,
      code: "too_many_special_cards"
    });
  });

  it("rejects cards that are not in the hand", () => {
    const state = buildState({ hands: [[num("red", 1)], unplayable(3)], top: num("red", 2) });
    expect(applyPlay(state, "p0", { cardIds: ["missing"] }, rng)).toEqual({ ok: false, code: "card_not_in_hand" });
  });
});

describe("+2 (R10)", () => {
  it("stacks across turns with any color, and drawing completes the penalty and ends the turn", () => {
    const redPlus2 = plus2("red");
    const bluePlus2 = plus2("blue");
    let state = buildState({
      hands: [[redPlus2, num("red", 1)], [bluePlus2, num("red", 1)], unplayable(5), unplayable(5)],
      top: num("red", 2)
    });

    state = expectOk(applyPlay(state, "p0", { cardIds: [redPlus2.id] }, rng)).state;
    expect(state.pendingPenalty).toBe(2);
    expect(applyDraw(state, "p1", rng).ok).toBe(true);

    state = expectOk(applyPlay(state, "p1", { cardIds: [bluePlus2.id] }, rng)).state;
    expect(state.pendingPenalty).toBe(4);
    expect(state.currentPlayerId).toBe("p2");

    const unrelated = hand(state, "p2")[0];
    expect(applyPlay(state, "p2", { cardIds: [unrelated.id] }, rng)).toEqual({ ok: false, code: "penalty_active" });

    const drawn = expectOk(applyDraw(state, "p2", rng));
    expect(drawn.effects).toContainEqual({ type: "penaltyDrawn", draw: { userId: "p2", requested: 4, actual: 4 } });
    expect(hand(drawn.state, "p2")).toHaveLength(9);
    expect(drawn.state.pendingPenalty).toBe(0);
    expect(drawn.state.currentPlayerId).toBe("p3");
    expect(topCard(drawn.state)).toEqual(bluePlus2);
  });

  it("after the penalty is drawn, the next player follows the color of the +2 (R4)", () => {
    const blue3 = num("blue", 3);
    const state = buildState({ hands: [unplayable(3), [blue3, num("red", 1)]], top: plus2("blue"), current: 1 });
    expectOk(applyPlay(state, "p1", { cardIds: [blue3.id] }, rng));
  });

  it("a +2 played on a +2 after the penalty was drawn starts a new penalty of 2", () => {
    const greenPlus2 = plus2("green");
    const state = buildState({ hands: [[greenPlus2, num("red", 1)], unplayable(3)], top: plus2("blue") });
    expect(expectOk(applyPlay(state, "p0", { cardIds: [greenPlus2.id] }, rng)).state.pendingPenalty).toBe(2);
  });

  it("R16: a penalty that reaches the hand limit is completed after the cards that fit", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(18), unplayable(3)], top: plus2("red"), current: 1, pendingPenalty: 4 });
    const result = expectOk(applyDraw(state, "p1", rng));
    expect(hand(result.state, "p1")).toHaveLength(20);
    expect(result.state.pendingPenalty).toBe(0);
    expect(result.state.currentPlayerId).toBe("p2");
  });

  it("a player at 20 cards completes the penalty by drawing 0 cards", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(20), unplayable(3)], top: plus2("red"), current: 1, pendingPenalty: 2 });
    const result = expectOk(applyDraw(state, "p1", rng));
    expect(result.effects).toContainEqual({ type: "penaltyDrawn", draw: { userId: "p1", requested: 2, actual: 0 } });
    expect(result.state.pendingPenalty).toBe(0);
    expect(result.state.currentPlayerId).toBe("p2");
  });

  it("the server draws the penalty for a disconnected player", () => {
    const redPlus2 = plus2("red");
    const state = buildState({
      hands: [[redPlus2, num("red", 1)], unplayable(3), unplayable(3)],
      top: num("red", 2),
      presence: ["connected", "disconnected", "connected"]
    });
    const result = expectOk(applyPlay(state, "p0", { cardIds: [redPlus2.id] }, rng));
    expect(hand(result.state, "p1")).toHaveLength(5);
    expect(result.state.pendingPenalty).toBe(0);
    expect(result.state.currentPlayerId).toBe("p2");
  });

  it("a forfeit of the affected player discards the penalty", () => {
    const state = buildState({ hands: [unplayable(3), unplayable(3), unplayable(3)], top: plus2("red"), current: 1, pendingPenalty: 4 });
    const result = expectOk(applyForfeit(state, "p1", rng));
    expect(result.state.pendingPenalty).toBe(0);
    expect(result.state.currentPlayerId).toBe("p2");
    expect(hand(result.state, "p2")).toHaveLength(3);
  });
});

describe("Storm (R11)", () => {
  it("applies one shared value, capped individually by the hand limit; the Storm player draws nothing", () => {
    const stormCard = storm();
    const state = buildState({
      hands: [[stormCard, num("red", 1)], unplayable(10), unplayable(19), unplayable(20)],
      top: num("red", 2)
    });

    const result = expectOk(applyPlay(state, "p0", { cardIds: [stormCard.id] }, fixedRng(3)));

    expect(result.effects).toContainEqual({
      type: "storm",
      stormPlayerId: "p0",
      value: 3,
      draws: [
        { userId: "p1", requested: 3, actual: 3 },
        { userId: "p2", requested: 3, actual: 1 },
        { userId: "p3", requested: 3, actual: 0 }
      ]
    });
    expect(hand(result.state, "p0")).toHaveLength(1);
    expect(hand(result.state, "p1")).toHaveLength(13);
    expect(hand(result.state, "p2")).toHaveLength(20);
  });

  it("selects the value exactly once and deals clockwise from the next player, including disconnected players", () => {
    const stormCard = storm();
    let stormCalls = 0;
    const countingRng = {
      nextInt: (min: number, max: number) => {
        if (min === 1 && max === 3) stormCalls++;
        return 2;
      }
    };
    const state = buildState({
      hands: [unplayable(3), unplayable(3), [stormCard, num("red", 1)], unplayable(3)],
      top: num("red", 2),
      current: 2,
      presence: ["connected", "disconnected", "connected", "connected"]
    });
    player(state, "p0").matchStatus = "finished";

    const result = expectOk(applyPlay(state, "p2", { cardIds: [stormCard.id] }, countingRng));
    const effect = result.effects.find((candidate) => candidate.type === "storm");

    expect(stormCalls).toBe(1);
    expect(effect).toMatchObject({ value: 2, draws: [{ userId: "p3" }, { userId: "p1" }] });
  });

  it("R20: a last-card Storm finishes the Storm player", () => {
    const stormCard = storm();
    const state = buildState({ hands: [[stormCard], unplayable(3), unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyPlay(state, "p0", { cardIds: [stormCard.id] }, fixedRng(1)));
    expect(player(result.state, "p0").matchStatus).toBe("finished");
    expect(result.state.finishingOrder).toEqual(["p0"]);
  });

  it("is not playable during a +2 penalty", () => {
    const stormCard = storm();
    const state = buildState({ hands: [[stormCard, num("red", 1)], unplayable(3)], top: plus2("red"), pendingPenalty: 2 });
    expect(applyPlay(state, "p0", { cardIds: [stormCard.id] }, rng)).toEqual({ ok: false, code: "penalty_active" });
  });
});

describe("Swap (R12)", () => {
  it("exchanges the chosen card with a blindly picked card through a fresh permutation", () => {
    const swapCard = swap("red");
    const given = num("yellow", 9);
    const targetHand = [num("blue", 1), num("blue", 2), num("blue", 3), num("blue", 4)];
    const state = buildState({ hands: [[swapCard, given, num("red", 1)], [...targetHand]], top: num("red", 2) });

    const result = expectOk(
      applyPlay(
        state,
        "p0",
        { cardIds: [swapCard.id], targetPlayerId: "p1", swapCardId: given.id, targetCardPosition: 2 },
        createSeededRng(7)
      )
    );

    const expectedIndex = shuffle([0, 1, 2, 3], createSeededRng(7))[2];
    const received = targetHand[expectedIndex];

    expect(hand(result.state, "p0")).toContainEqual(received);
    expect(hand(result.state, "p0")).not.toContainEqual(given);
    expect(hand(result.state, "p1")).toContainEqual(given);
    expect(hand(result.state, "p1")).toHaveLength(4);
    expect(result.effects).toContainEqual({ type: "swap", actorId: "p0", targetId: "p1", exchanged: true });
    expect(result.privateEvents).toEqual([
      { type: "swapResult", userId: "p0", result: { otherPlayerId: "p1", given, received } },
      { type: "swapResult", userId: "p1", result: { otherPlayerId: "p0", given: received, received: given } }
    ]);
  });

  it("a last-card Swap skips the exchange and the player finishes", () => {
    const swapCard = swap("red");
    const state = buildState({ hands: [[swapCard], unplayable(3), unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyPlay(state, "p0", { cardIds: [swapCard.id], targetPlayerId: "p1" }, rng));
    expect(result.effects).toContainEqual({ type: "swap", actorId: "p0", targetId: "p1", exchanged: false });
    expect(hand(result.state, "p1")).toHaveLength(3);
    expect(player(result.state, "p0").matchStatus).toBe("finished");
  });

  it("validates the target and the selection", () => {
    const swapCard = swap("red");
    const own = num("blue", 9);
    const state = buildState({
      hands: [[swapCard, own], unplayable(3), unplayable(3)],
      top: num("red", 2),
      presence: ["connected", "connected", "disconnected"]
    });
    const play = (extra: object) => applyPlay(state, "p0", { cardIds: [swapCard.id], ...extra }, rng);

    expect(play({ swapCardId: own.id, targetCardPosition: 0 })).toEqual({ ok: false, code: "missing_target" });
    expect(play({ targetPlayerId: "p2", swapCardId: own.id, targetCardPosition: 0 })).toEqual({
      ok: false,
      code: "invalid_target"
    });
    expect(play({ targetPlayerId: "p0", swapCardId: own.id, targetCardPosition: 0 })).toEqual({
      ok: false,
      code: "invalid_target"
    });
    expect(play({ targetPlayerId: "p1" })).toEqual({ ok: false, code: "missing_swap_selection" });
    expect(play({ targetPlayerId: "p1", swapCardId: own.id, targetCardPosition: 3 })).toEqual({
      ok: false,
      code: "invalid_target_position"
    });
    expect(play({ targetPlayerId: "p1", swapCardId: swapCard.id, targetCardPosition: 0 })).toEqual({
      ok: false,
      code: "card_not_in_hand"
    });
  });

  it("rejects target and swap selection fields on other cards", () => {
    const red3 = num("red", 3);
    const state = buildState({ hands: [[red3, num("red", 1)], unplayable(3)], top: num("red", 2) });
    expect(applyPlay(state, "p0", { cardIds: [red3.id], targetPlayerId: "p1" }, rng)).toEqual({
      ok: false,
      code: "unexpected_target"
    });
    expect(applyPlay(state, "p0", { cardIds: [red3.id], chosenColor: "blue" }, rng)).toEqual({
      ok: false,
      code: "unexpected_color"
    });
  });
});

describe("Spy (R14)", () => {
  it("sends a snapshot of the target's hand only to the Spy player and moves no cards", () => {
    const spyCard = spy();
    const targetHand = [num("blue", 1), plus2("green")];
    const state = buildState({ hands: [[spyCard, num("red", 1)], [...targetHand], unplayable(3)], top: num("red", 2) });

    const result = expectOk(applyPlay(state, "p0", { cardIds: [spyCard.id], targetPlayerId: "p1" }, rng));

    expect(result.privateEvents).toEqual([
      { type: "spyReveal", userId: "p0", reveal: { targetPlayerId: "p1", hand: targetHand } }
    ]);
    expect(result.effects).toContainEqual({ type: "spy", actorId: "p0", targetId: "p1" });
    expect(JSON.stringify(result.effects)).not.toContain(targetHand[0].id);
    expect(hand(result.state, "p1")).toEqual(targetHand);
    expect(result.state.currentPlayerId).toBe("p1");
  });
});

describe("Color Change (R6, R13)", () => {
  it("requires a color, and the color stays active after a draw and a pass until a card is played", () => {
    const change = colorChange();
    const green4 = num("green", 4);
    let state = buildState({
      hands: [[change, num("red", 1)], unplayable(20), [green4, num("red", 1)]],
      top: num("red", 2)
    });

    expect(applyPlay(state, "p0", { cardIds: [change.id] }, rng)).toEqual({ ok: false, code: "missing_color" });

    state = expectOk(applyPlay(state, "p0", { cardIds: [change.id], chosenColor: "yellow" }, rng)).state;
    expect(state.activeColor).toBe("yellow");

    // p1 holds 20 cards without a yellow card and passes.
    state = expectOk(applyDraw(state, "p1", rng)).state;
    expect(state.activeColor).toBe("yellow");

    // p2 draws instead of playing.
    state = expectOk(applyDraw(state, "p2", rng)).state;
    expect(state.activeColor).toBe("yellow");

    // p0 plays a yellow card on the Color Change, which clears it.
    const yellow = num("yellow", 8);
    player(state, "p0").hand.push(yellow);
    state = expectOk(applyPlay(state, "p0", { cardIds: [yellow.id] }, rng)).state;
    expect(state.activeColor).toBeNull();
  });
});

describe("finishing (R20)", () => {
  it("a finished player becomes a spectator and the match continues without them", () => {
    const last = num("red", 3);
    const state = buildState({ hands: [[last], unplayable(3), unplayable(3)], top: num("red", 2) });
    const result = expectOk(applyPlay(state, "p0", { cardIds: [last.id] }, rng));

    expect(player(result.state, "p0")).toMatchObject({ matchStatus: "finished", finishPosition: 1 });
    expect(result.effects).toContainEqual({ type: "playerFinished", userId: "p0", position: 1 });
    expect(result.state.phase).toBe("awaiting_action");

    let next = expectOk(applyDraw(result.state, "p1", rng)).state;
    expect(next.currentPlayerId).toBe("p2");
    next = expectOk(applyDraw(next, "p2", rng)).state;
    expect(next.currentPlayerId).toBe("p1");
  });
});
