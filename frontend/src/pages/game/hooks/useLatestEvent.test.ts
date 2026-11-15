import { act, renderHook } from "@testing-library/react";
import type { LogItem } from "./useEffectLog";
import { TOAST_MS, useLatestEvent } from "./useLatestEvent";

const played: LogItem = {
  id: 1,
  entry: { type: "effect", effect: { type: "cardsPlayed", userId: "u1", cards: [], chosenColor: null } }
};
const storm: LogItem = {
  id: 2,
  entry: { type: "effect", effect: { type: "storm", stormPlayerId: "u1", value: 3, draws: [] } }
};

describe("useLatestEvent", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows only notable events, and only for a short time", () => {
    const { result, rerender } = renderHook(({ items }) => useLatestEvent(items), {
      initialProps: { items: [played] }
    });
    expect(result.current).toBeNull();

    rerender({ items: [storm, played] });
    expect(result.current).toBe(storm);

    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(result.current).toBeNull();
  });
});
