// Whole seconds left until the turn deadline sent by the server; `null` without a running turn.
// The deadline is on the server's clock, so the client's own clock is corrected by the difference
// measured when the view arrived (`serverTime`).

import { useEffect, useMemo, useState } from "react";

const TICK_MS = 250;

function secondsLeft(deadline: number | null, clockOffset: number): number | null {
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - (Date.now() + clockOffset)) / 1000));
}

export function useCountdown(deadline: number | null, serverTime: number): number | null {
  // Recomputed for every received view, which carries a new `serverTime`.
  const clockOffset = useMemo(() => serverTime - Date.now(), [serverTime]);
  const [seconds, setSeconds] = useState(() => secondsLeft(deadline, clockOffset));

  useEffect(() => {
    setSeconds(secondsLeft(deadline, clockOffset));
    if (deadline === null) {
      return;
    }
    // The clock is checked often, but React renders again only when the whole second changes,
    // because setting the same number again is skipped.
    const interval = setInterval(() => setSeconds(secondsLeft(deadline, clockOffset)), TICK_MS);
    return () => clearInterval(interval);
  }, [deadline, clockOffset]);

  return seconds;
}
