// Where the new top card flies in from, as an offset from the middle of the table area in percent
// of its width and height. It comes from the seat positions of `seatLayout`, so nothing is measured
// in the DOM: the `card-land` animation turns the percentages into distance with container query
// units. This is presentation only.

import type { MatchView } from "@wildhand/shared";
import { useDiscardOrigin } from "./useDiscardOrigin";
import type { SeatLayout } from "./useSeatLayout";

export interface DiscardFlight {
  x: number;
  y: number;
  /** Played by an opponent: on phones the seats are a strip above the table, so it comes from above. */
  fromOpponent: boolean;
}

/** The own hand is below the table. */
const FROM_HAND: DiscardFlight = { x: 0, y: 60, fromOpponent: false };

export function useDiscardFlight(view: MatchView, userId: string, layout: SeatLayout): DiscardFlight | null {
  const origin = useDiscardOrigin(view.topCard.id, view.currentPlayerId);

  if (origin === null) {
    return null;
  }
  if (origin === userId) {
    return FROM_HAND;
  }
  const seat = layout.others.find((placement) => placement.player.userId === origin);
  return seat ? { x: seat.x - 50, y: seat.y - 50, fromOpponent: true } : null;
}
