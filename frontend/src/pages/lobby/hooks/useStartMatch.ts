// Sends `room:start` for the host. Whether the match can start is decided by the server (R1, R24).

import { useAction } from "../../../hooks/useAction";
import { sendAction } from "../../../services/actions";

export function useStartMatch() {
  const { run, pending, error } = useAction();

  return { startMatch: () => void run(() => sendAction("room:start", {})), pending, error };
}
