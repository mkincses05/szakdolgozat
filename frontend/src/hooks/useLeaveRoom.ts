// Sends `room:leave` and forgets the session once the server has removed the player.

import { useState } from "react";
import { useServerState } from "./useServerState";
import { sendAction, type ActionErrorCode } from "../services/actions";

export function useLeaveRoom() {
  const { endSession } = useServerState();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);

  const leaveRoom = async () => {
    setError(null);
    setPending(true);
    const ack = await sendAction("room:leave", {});
    setPending(false);
    // `not_in_room`: the server no longer knows the session, so there is nothing to leave.
    if (ack.ok || ack.code === "not_in_room") {
      endSession();
    } else {
      setError(ack.code);
    }
  };

  return { leaveRoom: () => void leaveRoom(), pending, error };
}
