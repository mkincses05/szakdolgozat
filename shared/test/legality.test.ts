import { describe, expect, it } from "vitest";
import {
  getComboPartners,
  getDrawOption,
  getLegalCards,
  getSwapOffers,
  getValidTargets,
  isPlayableOn,
  type Card,
  type CardColor,
  type CardNumber,
  type PlayerMatchView,
  type PublicPlayerView
} from "../src/index.js";

let nextId = 0;
const num = (color: CardColor, number: CardNumber): Card => ({
  id: `c${nextId++}`,
  deckInstance: 1,
  kind: "number",
  color,
  number
});
const special = (kind: "plus2" | "swap", color: CardColor): Card => ({ id: `c${nextId++}`, deckInstance: 1, kind, color });
const wild = (kind: "storm" | "colorChange" | "spy"): Card => ({ id: `c${nextId++}`, deckInstance: 1, kind });

function playerView(userId: string, overrides: Partial<PublicPlayerView> = {}): PublicPlayerView {
  return {
    userId,
    displayName: userId,
    seat: Number(userId.slice(1)),
    handSize: 5,
    matchStatus: "active",
    presence: "connected",
    finishPosition: null,
    isBot: false,
    ...overrides
  };
}

function view(hand: Card[], overrides: Partial<PlayerMatchView> = {}): PlayerMatchView {
  return {
    viewer: "player",
    userId: "p0",
    hand,
    matchId: "m",
    phase: "awaiting_action",
    players: [playerView("p0", { handSize: hand.length }), playerView("p1"), playerView("p2")],
    currentPlayerId: "p0",
    topCard: num("red", 5),
    activeColor: null,
    pendingPenalty: 0,
    drawPileSize: 50,
    turnDeadline: null,
    finishingOrder: [],
    stateVersion: 3,
    ...overrides
  };
}

const twenty = (extra: Card[] = []) => [...Array.from({ length: 20 - extra.length }, () => num("blue", 1)), ...extra];

describe("isPlayableOn", () => {
  it("applies the colored, Color Change, Storm/Spy, and penalty rules (R4–R7)", () => {
    const context = { topCard: num("red", 5), activeColor: null, pendingPenalty: 0 };
    expect(isPlayableOn(num("blue", 5), context)).toBe(true);
    expect(isPlayableOn(special("plus2", "blue"), context)).toBe(false);
    expect(isPlayableOn(special("plus2", "blue"), { ...context, topCard: special("plus2", "red") })).toBe(true);
    expect(isPlayableOn(num("green", 2), { ...context, topCard: wild("colorChange"), activeColor: "green" })).toBe(true);
    expect(isPlayableOn(num("red", 2), { ...context, topCard: wild("colorChange"), activeColor: "green" })).toBe(false);
    expect(isPlayableOn(num("yellow", 9), { ...context, topCard: wild("spy") })).toBe(true);
    expect(isPlayableOn(wild("storm"), { ...context, pendingPenalty: 2 })).toBe(false);
  });
});

describe("getLegalCards", () => {
  it("returns the playable cards of the hand on the viewer's turn", () => {
    const red3 = num("red", 3);
    const blue5 = num("blue", 5);
    const storm = wild("storm");
    expect(getLegalCards(view([red3, num("green", 1), blue5, storm]))).toEqual([red3, blue5, storm]);
  });

  it("returns nothing when it is not the viewer's turn or the match has ended", () => {
    const hand = [num("red", 3)];
    expect(getLegalCards(view(hand, { currentPlayerId: "p1" }))).toEqual([]);
    expect(getLegalCards(view(hand, { phase: "ended", currentPlayerId: null }))).toEqual([]);
  });

  it("excludes Swap and Spy without an active, connected target (R9)", () => {
    const swap = special("swap", "red");
    const spy = wild("spy");
    const players = [
      playerView("p0"),
      playerView("p1", { presence: "disconnected" }),
      playerView("p2", { matchStatus: "finished" })
    ];

    expect(getLegalCards(view([swap, spy], { players }))).toEqual([]);
    expect(getLegalCards(view([swap, spy]))).toEqual([swap, spy]);
  });
});

describe("getValidTargets", () => {
  it("lists other active, connected players only", () => {
    const players = [
      playerView("p0"),
      playerView("p1"),
      playerView("p2", { presence: "disconnected" }),
      playerView("p3", { matchStatus: "forfeited", presence: "left" })
    ];
    expect(getValidTargets(view([], { players })).map((player) => player.userId)).toEqual(["p1"]);
  });
});

describe("getComboPartners", () => {
  it("returns the other number cards with the same number, of any color (R8)", () => {
    const red7 = num("red", 7);
    const blue7 = num("blue", 7);
    const green7 = num("green", 7);
    expect(getComboPartners(view([red7, blue7, num("red", 8), green7]), red7)).toEqual([blue7, green7]);
  });

  it("returns nothing for special cards (R9)", () => {
    const plus2 = special("plus2", "red");
    expect(getComboPartners(view([plus2, special("plus2", "blue")]), plus2)).toEqual([]);
  });
});

describe("getSwapOffers", () => {
  it("offers every other card of the hand (R12)", () => {
    const swap = special("swap", "red");
    const red3 = num("red", 3);
    const storm = wild("storm");
    expect(getSwapOffers(view([red3, swap, storm]), swap)).toEqual([red3, storm]);
  });

  it("offers nothing when the Swap is the last card (R12)", () => {
    const swap = special("swap", "red");
    expect(getSwapOffers(view([swap]), swap)).toEqual([]);
  });
});

describe("getDrawOption", () => {
  it("is the penalty while a +2 penalty is active (R10)", () => {
    expect(getDrawOption(view(twenty([special("plus2", "blue")]), { pendingPenalty: 4 }))).toBe("penalty");
  });

  it("is a draw below 20 cards, even with a legal card (R15)", () => {
    expect(getDrawOption(view([num("red", 3)]))).toBe("draw");
  });

  it("is a pass at 20 cards without a legal card, and not allowed with one (R17)", () => {
    expect(getDrawOption(view(twenty()))).toBe("pass");
    expect(getDrawOption(view(twenty([num("red", 3)])))).toBeNull();
  });

  it("is not allowed when it is not the viewer's turn", () => {
    expect(getDrawOption(view([num("red", 3)], { currentPlayerId: "p1" }))).toBeNull();
  });
});
