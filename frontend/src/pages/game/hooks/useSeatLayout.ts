// Arranges the players around the oval table. This is presentation only: the seat order comes from
// the server (`players` is in seat order), and play goes clockwise in that order (R3).
//
// A player sees their own seat at the bottom, next to the hand; the others sit on the upper arc of
// the table. On the screen clockwise means bottom, left, top, right, so the next player sits on the
// left and the previous one on the right. A spectator who does not play sees everyone around the
// whole table, starting at the bottom.

import type { PublicPlayerView } from "@wildhand/shared";
import { useMemo } from "react";

export interface SeatPlacement {
  player: PublicPlayerView;
  /** Center of the seat, in percent of the table area. */
  x: number;
  y: number;
}

export interface SeatLayout {
  /** The viewer's own seat, shown next to the hand; `null` for a spectator who does not play. */
  me: PublicPlayerView | null;
  /** The other players in clockwise order, starting with the next player after the viewer. */
  others: SeatPlacement[];
  /** Many players: smaller seats, so that they do not overlap. */
  compact: boolean;
}

/** Radii of the ellipse the seats sit on, in percent of the table area. */
const RADIUS_X = 44;
const RADIUS_Y = 37;
/** From this many seats on the table, seats are drawn smaller. */
const COMPACT_FROM = 5;

/** The arc of the opponents, in degrees: wider for more players, centered on the top (270°). */
function arcSpread(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 160;
  if (count === 3) return 200;
  return 240;
}

/** Screen angles: 0° is right, 90° is bottom (y grows downwards), so growing angles go clockwise. */
function place(player: PublicPlayerView, degrees: number): SeatPlacement {
  const radians = (degrees * Math.PI) / 180;
  return {
    player,
    x: Math.round((50 + RADIUS_X * Math.cos(radians)) * 100) / 100,
    y: Math.round((50 + RADIUS_Y * Math.sin(radians)) * 100) / 100
  };
}

export function seatLayout(players: PublicPlayerView[], userId: string): SeatLayout {
  const myIndex = players.findIndex((player) => player.userId === userId);

  if (myIndex === -1) {
    return {
      me: null,
      others: players.map((player, index) => place(player, 90 + (360 * index) / players.length)),
      compact: players.length >= COMPACT_FROM
    };
  }

  const others = [...players.slice(myIndex + 1), ...players.slice(0, myIndex)];
  const spread = arcSpread(others.length);
  const first = 270 - spread / 2;
  const step = others.length > 1 ? spread / (others.length - 1) : 0;

  return {
    me: players[myIndex],
    others: others.map((player, index) => place(player, first + step * index)),
    compact: others.length >= COMPACT_FROM
  };
}

export function useSeatLayout(players: PublicPlayerView[], userId: string): SeatLayout {
  return useMemo(() => seatLayout(players, userId), [players, userId]);
}
