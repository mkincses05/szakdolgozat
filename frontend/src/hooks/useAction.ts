// Runs one client action at a time: tracks whether it is pending and keeps the error code of a
// rejected acknowledgement for the component to show.

import { useCallback, useState } from "react";
import type { ActionErrorCode } from "../services/actions";

type Result = { ok: true } | { ok: false; code: ActionErrorCode };

export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);

  /** `isSuccess` lets a caller accept an error code as success, so it is not shown. */
  const run = useCallback(
    async <T extends Result>(request: () => Promise<T>, isSuccess: (ack: T) => boolean = (ack) => ack.ok): Promise<T> => {
      setError(null);
      setPending(true);
      const ack = await request();
      setPending(false);
      if (!ack.ok && !isSuccess(ack)) {
        setError(ack.code);
      }
      return ack;
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError };
}
