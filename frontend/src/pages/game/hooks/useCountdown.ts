// Whole seconds left until the turn deadline sent by the server; `null` without a running turn.
// The deadline is on the server's clock, so the client's own clock is corrected by the difference
// measured when the view arrived (`serverTime`).

import { useEffect, useMemo, useState } from "react";

const TICK_MS = 250;

export function useCountdown(deadline: number | null, serverTime: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  // Recomputed for every received view, which carries a new `serverTime`.
  const clockOffset = useMemo(() => serverTime - Date.now(), [serverTime]);

  useEffect(() => {
    if (deadline === null) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  return deadline === null ? null : Math.max(0, Math.ceil((deadline - (now + clockOffset)) / 1000));
}
