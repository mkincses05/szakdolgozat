import type { PublicPlayerView } from "@wildhand/shared";
import { seatLayout } from "./useSeatLayout";

function players(count: number): PublicPlayerView[] {
  return Array.from({ length: count }, (_, seat) => ({
    userId: `u${seat}`,
    displayName: `Player ${seat}`,
    seat,
    handSize: 7,
    matchStatus: "active",
    presence: "connected",
    finishPosition: null,
    isBot: false,
    botLevel: null
  }));
}

/** Smallest distance between two seats on a 1000×500 px table area, a small laptop screen. */
function minDistance(points: { x: number; y: number }[]): number {
  let min = Infinity;
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      min = Math.min(min, Math.hypot((points[a].x - points[b].x) * 10, (points[a].y - points[b].y) * 5));
    }
  }
  return min;
}

describe("seatLayout", () => {
  it.each([2, 3, 4, 5, 6, 7, 8])("seats %i players without overlaps, with the viewer at the bottom", (count) => {
    const layout = seatLayout(players(count), "u0");

    expect(layout.me?.userId).toBe("u0");
    expect(layout.others).toHaveLength(count - 1);
    // Everyone else sits on the upper part of the table, above the viewer's hand.
    for (const seat of layout.others) {
      expect(seat.y).toBeLessThanOrEqual(71);
      expect(seat.x).toBeGreaterThanOrEqual(5);
      expect(seat.x).toBeLessThanOrEqual(95);
    }
    expect(minDistance([...layout.others, { x: 50, y: 100 }])).toBeGreaterThanOrEqual(120);
    expect(layout.compact).toBe(count - 1 >= 5);
  });

  it("puts the only opponent of a two-player match at the top", () => {
    expect(seatLayout(players(2), "u0").others[0]).toMatchObject({ x: 50, y: 13 });
  });

  it("goes clockwise from the viewer: the next player sits on the left, the previous one on the right", () => {
    const layout = seatLayout(players(5), "u2");

    expect(layout.others.map((seat) => seat.player.userId)).toEqual(["u3", "u4", "u0", "u1"]);
    expect(layout.others[0].x).toBeLessThan(50);
    expect(layout.others[3].x).toBeGreaterThan(50);
  });

  it.each([2, 5, 8])("seats a spectator's view of %i players around the whole table", (count) => {
    const layout = seatLayout(players(count), "spectator");

    expect(layout.me).toBeNull();
    expect(layout.others.map((seat) => seat.player.userId)).toEqual(players(count).map((player) => player.userId));
    expect(layout.others[0]).toMatchObject({ x: 50, y: 87 });
    expect(minDistance(layout.others)).toBeGreaterThanOrEqual(120);
  });
});
