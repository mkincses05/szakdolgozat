// The share of the turn time that is left, for the countdown ring. The server sends only the
// deadline, so the length of the turn is the time left when this deadline was first seen.

import { useState } from "react";
import { useCountdown } from "./useCountdown";

export function useTurnProgress(deadline: number | null, serverTime: number): number | null {
  const secondsLeft = useCountdown(deadline, serverTime);
  const [start, setStart] = useState({ deadline, seconds: secondsLeft });

  if (start.deadline !== deadline) {
    // A new turn: remember its full length (adjusting state while rendering, without an effect).
    setStart({ deadline, seconds: secondsLeft });
  }

  if (secondsLeft === null || !start.seconds) {
    return null;
  }
  return Math.min(1, secondsLeft / start.seconds);
}
