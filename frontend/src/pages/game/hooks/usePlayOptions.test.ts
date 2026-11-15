import type { Card, PlayerMatchView } from "@wildhand/shared";
import { act, renderHook } from "@testing-library/react";
import { usePlayOptions } from "./usePlayOptions";

const redSwap: Card = { id: "rs", deckInstance: 1, kind: "swap", color: "red" };
const green5: Card = { id: "g5", deckInstance: 1, kind: "number", color: "green", number: 5 };

const view: PlayerMatchView = {
  viewer: "player",
  userId: "u1",
  matchId: "m1",
  phase: "awaiting_action",
  players: [
    { userId: "u1", displayName: "Anna", seat: 0, handSize: 2, matchStatus: "active", presence: "connected", finishPosition: null, isBot: false, botLevel: null },
    { userId: "u2", displayName: "Bela", seat: 1, handSize: 3, matchStatus: "active", presence: "connected", finishPosition: null, isBot: false, botLevel: null }
  ],
  currentPlayerId: "u1",
  topCard: { id: "r2", deckInstance: 1, kind: "number", color: "red", number: 2 },
  activeColor: null,
  pendingPenalty: 0,
  drawPileSize: 80,
  serverTime: Date.now(),
  turnDeadline: null,
  finishingOrder: [],
  stateVersion: 1,
  hand: [redSwap, green5]
};

describe("usePlayOptions", () => {
  it("keeps every Swap choice when they are made in quick succession", () => {
    const { result } = renderHook(() => usePlayOptions(view, redSwap));

    act(() => {
      result.current.chooseTarget("u2");
      result.current.chooseSwapCard("g5");
      result.current.choosePosition(2);
    });

    expect(result.current.options).toEqual({ targetPlayerId: "u2", swapCardId: "g5", targetCardPosition: 2 });
    expect(result.current.complete).toBe(true);
  });

  it("asks for the face-down card again after a new target is chosen", () => {
    const { result } = renderHook(() => usePlayOptions(view, redSwap));

    act(() => {
      result.current.chooseTarget("u2");
      result.current.choosePosition(1);
    });
    act(() => result.current.chooseTarget("u2"));

    expect(result.current.options.targetCardPosition).toBeUndefined();
  });
});
