// Whole seconds left until the turn deadline sent by the server; `null` without a running turn.

import { useEffect, useState } from "react";

const TICK_MS = 250;

export function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
}
