// Copies a text to the clipboard and reports the result for a short time, for example on the button
// that copies the room code.

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

const RESET_MS = 2_000;

export function useCopyToClipboard() {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    clearTimeout(timer.current);
    try {
      // The clipboard API is missing on insecure origins, which also ends up here.
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  }, []);

  return { state, copy };
}
