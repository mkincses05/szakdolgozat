// Sends `room:start` for the host. Whether the match can start is decided by the server (R1, R24).

import { useState } from "react";
import { sendAction, type ActionErrorCode } from "../../../services/actions";

export function useStartMatch() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);

  const startMatch = async () => {
    setError(null);
    setPending(true);
    const ack = await sendAction("room:start", {});
    setPending(false);
    if (!ack.ok) {
      setError(ack.code);
    }
  };

  return { startMatch: () => void startMatch(), pending, error };
}
