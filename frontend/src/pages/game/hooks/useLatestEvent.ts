// The newest notable event for the toast on the table, shown for a short time. Plays and draws are
// visible on the table itself, so only the special events get a toast; a Spy reveal has its own
// dialog.

import type { GameEffectType } from "@wildhand/shared";
import { useEffect, useState } from "react";
import type { LogItem } from "./useEffectLog";

/** How long a toast is shown; matches the `toast` animation. */
export const TOAST_MS = 2_600;

const NOTABLE_EFFECTS: ReadonlySet<GameEffectType> = new Set([
  "storm",
  "penaltyDrawn",
  "swap",
  "spy",
  "reshuffle",
  "playerFinished",
  "playerForfeited"
]);

function isNotable(item: LogItem): boolean {
  return item.entry.type === "swapResult" || (item.entry.type === "effect" && NOTABLE_EFFECTS.has(item.entry.effect.type));
}

export function useLatestEvent(items: LogItem[]): LogItem | null {
  const newest = items.find(isNotable) ?? null;
  const [expiredId, setExpiredId] = useState<number | null>(null);
  const newestId = newest?.id ?? null;

  useEffect(() => {
    if (newestId === null) {
      return;
    }
    const timer = setTimeout(() => setExpiredId(newestId), TOAST_MS);
    return () => clearTimeout(timer);
  }, [newestId]);

  return newest && newest.id !== expiredId ? newest : null;
}
