import { describe, expect, it } from "vitest";
import type { Card } from "@wildhand/shared";
import { hasLegalCard, isLegalCard, isPlayable } from "../../src/engine/legality.js";
import { buildState, colorChange, num, plus2, player, spy, storm, swap, type StateOptions } from "./helpers.js";

function playableOn(top: Card, cards: Card[], extra: Partial<StateOptions> = {}) {
  const state = buildState({ hands: [[], []], top, ...extra });
  return cards.map((card) => isPlayable(card, state));
}

describe("legal plays", () => {
  it("R4: number top card", () => {
    const top = num("red", 5);
    expect(
      playableOn(top, [num("red", 3), num("blue", 5), num("blue", 3), plus2("red"), plus2("blue"), swap("blue")])
    ).toEqual([true, true, false, true, false, false]);
  });

  it("R4: +2 top card accepts a +2 of any color but no other kind of another color", () => {
    const top = plus2("red");
    expect(playableOn(top, [plus2("blue"), num("red", 4), num("blue", 4), swap("blue")])).toEqual([
      true,
      true,
      false,
      false
    ]);
  });

  it("R4: Swap top card accepts a Swap of any color", () => {
    const top = swap("red");
    expect(playableOn(top, [swap("blue"), plus2("blue"), num("red", 0)])).toEqual([true, false, true]);
  });

  it("R5: any card is playable on Storm or Spy", () => {
    const cards = [num("blue", 1), plus2("green"), swap("yellow"), storm()];
    expect(playableOn(storm(), cards)).toEqual([true, true, true, true]);
    expect(playableOn(spy(), cards)).toEqual([true, true, true, true]);
  });

  it("R6: Color Change top card requires the chosen color or a wild card", () => {
    expect(
      playableOn(colorChange(), [num("green", 3), plus2("green"), num("red", 3), swap("red"), storm()], {
        activeColor: "green"
      })
    ).toEqual([true, true, false, false, true]);
  });

  it("R7: only a +2 is playable while a penalty is active", () => {
    expect(
      playableOn(num("red", 5), [plus2("blue"), num("red", 5), storm(), colorChange()], { pendingPenalty: 2 })
    ).toEqual([true, false, false, false]);
  });

  it("R9: wild cards are playable on any card", () => {
    expect(playableOn(num("red", 5), [storm(), colorChange(), spy()])).toEqual([true, true, true]);
  });

  it("R9: Swap and Spy are not legal without an active, connected target", () => {
    const swapCard = swap("red");
    const spyCard = spy();
    const state = buildState({
      hands: [[swapCard, spyCard], [num("blue", 1)], [num("blue", 2)]],
      top: num("red", 5),
      presence: ["connected", "disconnected", "connected"]
    });
    player(state, "p2").matchStatus = "finished";

    expect(isLegalCard(swapCard, state, "p0")).toBe(false);
    expect(isLegalCard(spyCard, state, "p0")).toBe(false);
    expect(hasLegalCard(state, player(state, "p0"))).toBe(false);

    player(state, "p1").presence = "connected";
    expect(isLegalCard(swapCard, state, "p0")).toBe(true);
  });
});
