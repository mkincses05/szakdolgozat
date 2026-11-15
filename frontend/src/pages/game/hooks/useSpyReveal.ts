// The newest Spy result, sent only to this player (R14), until the player closes it.

import type { SpyReveal } from "@wildhand/shared";
import { useState } from "react";
import type { LogItem } from "./useEffectLog";

export function useSpyReveal(items: LogItem[]): { reveal: SpyReveal | null; dismiss: () => void } {
  const newest = items.find((item) => item.entry.type === "spyReveal");
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  return {
    reveal: newest && newest.entry.type === "spyReveal" && newest.id !== dismissedId ? newest.entry.reveal : null,
    dismiss: () => setDismissedId(newest?.id ?? null)
  };
}
