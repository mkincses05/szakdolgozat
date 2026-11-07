// Sends `room:leave` and forgets the session once the server has removed the player.

import { sendAction } from "../services/actions";
import { useAction } from "./useAction";
import { useServerState } from "./useServerState";

export function useLeaveRoom() {
  const { endSession } = useServerState();
  const { run, pending, error } = useAction();

  const leaveRoom = async () => {
    // `not_in_room`: the server no longer knows the session (for example after the grace period
    // expired), so there is nothing to leave. A repeated leave gets its original `ok` answer.
    const left = (ack: { ok: boolean; code?: string }) => ack.ok || ack.code === "not_in_room";
    const ack = await run(() => sendAction("room:leave", {}), left);
    if (left(ack)) {
      endSession();
    }
  };

  return { leaveRoom: () => void leaveRoom(), pending, error };
}
