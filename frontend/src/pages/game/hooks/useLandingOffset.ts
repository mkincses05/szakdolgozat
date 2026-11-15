// The distance from the seat (or the own hand) of the player who played the top card to the
// discard pile, measured before the first paint of the new card, for the `card-land` animation.

import { useLayoutEffect, useRef, useState } from "react";

interface Offset {
  cardId: string;
  x: number;
  y: number;
}

/** `data-hand` marks the own hand, `data-seat-id` every seat at the table. */
function originElement(originUserId: string, mine: boolean): Element | null {
  return mine
    ? document.querySelector("[data-hand]")
    : document.querySelector(`[data-seat-id=${JSON.stringify(originUserId)}]`);
}

export function useLandingOffset(cardId: string, originUserId: string | null, mine: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState<Offset | null>(null);

  useLayoutEffect(() => {
    const target = ref.current;
    if (originUserId === null || target === null) {
      return;
    }
    const from = originElement(originUserId, mine)?.getBoundingClientRect();
    // A hidden origin (for example the own seat on phones) has no size: the card just appears.
    if (!from || from.width === 0) {
      return;
    }
    const to = target.getBoundingClientRect();
    setOffset({
      cardId,
      x: Math.round(from.left + from.width / 2 - (to.left + to.width / 2)),
      y: Math.round(from.top + from.height / 2 - (to.top + to.height / 2))
    });
  }, [cardId, originUserId, mine]);

  return { ref, offset: offset?.cardId === cardId ? offset : null };
}
