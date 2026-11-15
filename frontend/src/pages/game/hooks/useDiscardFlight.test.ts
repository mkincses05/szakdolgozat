import type { MatchView, PublicPlayerView } from "@wildhand/shared";
import { renderHook } from "@testing-library/react";
import { useDiscardFlight } from "./useDiscardFlight";
import { seatLayout } from "./useSeatLayout";

const player = (userId: string, seat: number): PublicPlayerView => ({
  userId,
  displayName: userId,
  seat,
  handSize: 7,
  matchStatus: "active",
  presence: "connected",
  finishPosition: null,
  isBot: false,
  botLevel: null
});

const players = [player("u1", 0), player("u2", 1)];
const view = (topCardId: string, currentPlayerId: string) =>
  ({ players, currentPlayerId, topCard: { id: topCardId } }) as unknown as MatchView;

describe("useDiscardFlight", () => {
  const layout = seatLayout(players, "u1");

  it("lets a card played by the opponent fly in from the opponent's seat", () => {
    const { result, rerender } = renderHook(({ v }) => useDiscardFlight(v, "u1", layout), {
      initialProps: { v: view("start", "u2") }
    });
    expect(result.current).toBeNull();

    rerender({ v: view("c1", "u1") });
    // The only opponent sits at the top center of the table.
    expect(result.current).toEqual({ x: 0, y: -37, fromOpponent: true });
  });

  it("lets the own card fly in from the hand below the table", () => {
    const { result, rerender } = renderHook(({ v }) => useDiscardFlight(v, "u1", layout), {
      initialProps: { v: view("start", "u1") }
    });

    rerender({ v: view("c1", "u2") });
    expect(result.current).toEqual({ x: 0, y: 60, fromOpponent: false });
  });
});
