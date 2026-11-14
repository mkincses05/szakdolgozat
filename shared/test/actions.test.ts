import { describe, expect, it } from "vitest";
import {
  BOT_LEVELS,
  getLegalActions,
  isBotLevel,
  type Card,
  type CardColor,
  type CardNumber,
  type LegalAction,
  type PlayerMatchView,
  type PublicPlayerView
} from "../src/index.js";

let nextId = 0;
const num = (color: CardColor, number: CardNumber): Card => ({ id: `c${nextId++}`, deckInstance: 1, kind: "number", color, number });
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
    botLevel: null,
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
    serverTime: 0,
    finishingOrder: [],
    stateVersion: 3,
    ...overrides
  };
}

const plays = (actions: LegalAction[]) => actions.filter((action) => action.type === "play");

describe("getLegalActions", () => {
  it("is empty when it is not the viewer's turn", () => {
    expect(getLegalActions(view([num("red", 1)], { currentPlayerId: "p1" }))).toEqual([]);
  });

  it("offers a draw next to the legal cards, and lists interchangeable copies once", () => {
    const red1a = num("red", 1);
    const actions = getLegalActions(view([red1a, num("red", 1), num("blue", 2)]));
    // red 1, both red 1s as a combo, and the draw.
    expect(actions).toHaveLength(3);
    expect(actions).toContainEqual({ type: "draw", option: "draw" });
    expect(plays(actions).map((action) => action.cardIds.length).sort()).toEqual([1, 2]);
  });

  it("lists every combo by its colors and its last card; only the first card must be legal (R8)", () => {
    const red5 = num("red", 5);
    const blue5 = num("blue", 5);
    const green5 = num("green", 5);
    const actions = plays(getLegalActions(view([red5, blue5, green5], { topCard: num("red", 9) })));
    const keys = actions.map((action) => action.cardIds.map((id) => [red5, blue5, green5].find((card) => card.id === id)!));

    // Every play starts with the legal red 5.
    expect(keys.every((cards) => cards[0] === red5)).toBe(true);
    // red; red+blue (blue last); red+green (green last); red+blue+green (blue or green last).
    expect(actions).toHaveLength(5);
  });

  it("allows a combo whose last card is the only legal one when another card can start it", () => {
    const red5 = num("red", 5);
    const blue5 = num("blue", 5);
    const actions = plays(getLegalActions(view([red5, blue5], { topCard: num("blue", 5) })));
    // Both 5s are legal on a blue 5: single red, single blue, red→blue, blue→red.
    expect(actions).toHaveLength(4);
  });

  it("enumerates Color Change colors, Spy targets, and Swap targets with every distinct offer", () => {
    const actions = plays(getLegalActions(view([wild("colorChange"), wild("spy"), special("swap", "red"), num("blue", 1)])));
    const colorChanges = actions.filter((action) => action.chosenColor !== undefined);
    const spies = actions.filter((action) => action.targetPlayerId !== undefined && action.swapCardId === undefined);
    const swaps = actions.filter((action) => action.swapCardId !== undefined);

    expect(colorChanges).toHaveLength(4);
    expect(spies).toHaveLength(2);
    // 2 targets × 3 other cards.
    expect(swaps).toHaveLength(6);
  });

  it("plays a last Swap card without an offer", () => {
    const actions = plays(getLegalActions(view([special("swap", "red")])));
    expect(actions).toEqual([
      { type: "play", cardIds: [expect.any(String)], targetPlayerId: "p1" },
      { type: "play", cardIds: [expect.any(String)], targetPlayerId: "p2" }
    ]);
  });

  it("allows only +2 cards and the penalty draw while a penalty is active (R7)", () => {
    const actions = getLegalActions(
      view([special("plus2", "blue"), num("red", 5), wild("storm")], { pendingPenalty: 2, topCard: special("plus2", "red") })
    );
    expect(actions).toHaveLength(2);
    expect(actions).toContainEqual({ type: "draw", option: "penalty" });
  });

  it("has no draw at 20 cards with a legal card, and a pass without one (R17)", () => {
    const withLegal = [...Array.from({ length: 19 }, () => num("blue", 1)), num("red", 2)];
    expect(getLegalActions(view(withLegal)).some((action) => action.type === "draw")).toBe(false);

    const withoutLegal = Array.from({ length: 20 }, () => num("blue", 1));
    expect(getLegalActions(view(withoutLegal))).toEqual([{ type: "draw", option: "pass" }]);
  });
});

describe("bot levels", () => {
  it("are recognized", () => {
    expect(BOT_LEVELS.every(isBotLevel)).toBe(true);
    expect(isBotLevel("expert")).toBe(false);
  });
});
