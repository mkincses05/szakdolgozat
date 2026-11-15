import { renderHook } from "@testing-library/react";
import { useDiscardOrigin } from "./useDiscardOrigin";

describe("useDiscardOrigin", () => {
  it("has no origin for the starting card", () => {
    const { result } = renderHook(() => useDiscardOrigin("start", "u1"));
    expect(result.current).toBeNull();
  });

  it("names the player who was on turn when a new top card arrives", () => {
    const { result, rerender } = renderHook(({ card, turn }) => useDiscardOrigin(card, turn), {
      initialProps: { card: "start", turn: "u1" as string | null }
    });

    // u1 plays: the next state has a new top card and u2 on turn.
    rerender({ card: "c1", turn: "u2" });
    expect(result.current).toBe("u1");

    // u2 draws instead of playing: the top card stays, so does its origin.
    rerender({ card: "c1", turn: "u3" });
    expect(result.current).toBe("u1");

    // u3 plays next.
    rerender({ card: "c2", turn: "u1" });
    expect(result.current).toBe("u3");
  });
});
