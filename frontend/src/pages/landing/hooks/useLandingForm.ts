// Form state of the landing page: validates the inputs with the shared schemas, then creates or
// joins a room and starts the session returned by the server. A logged-in player plays under the
// account name, so only guests type a name.

import { displayNameSchema, roomCodeSchema } from "@wildhand/shared";
import { useState } from "react";
import { useAction } from "../../../hooks/useAction";
import { useServerState } from "../../../hooks/useServerState";
import { sendAction, type ActionResult } from "../../../services/actions";

export type LandingValidationError = "displayName" | "roomCode";

export function useLandingForm(accountName: string | null) {
  const { startSession } = useServerState();
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [validationError, setValidationError] = useState<LandingValidationError | null>(null);
  const { run, pending, error: actionError, clearError } = useAction();

  /** Returns the trimmed name, or `null` after showing the validation error. */
  const validName = (): string | null => {
    setValidationError(null);
    clearError();
    if (accountName !== null) {
      return accountName;
    }
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      setValidationError("displayName");
      return null;
    }
    return parsed.data;
  };

  const enter = async (request: () => Promise<ActionResult<"room:create" | "room:join">>) => {
    const ack = await run(request);
    if (ack.ok) {
      startSession(ack.data);
    }
  };

  const createRoom = () => {
    const name = validName();
    if (name !== null) {
      void enter(() => sendAction("room:create", { displayName: name }));
    }
  };

  const joinRoom = () => {
    const name = validName();
    if (name === null) {
      return;
    }
    const code = roomCodeSchema.safeParse(roomCode);
    if (!code.success) {
      setValidationError("roomCode");
      return;
    }
    void enter(() => sendAction("room:join", { roomCode: code.data, displayName: name }));
  };

  return {
    displayName,
    setDisplayName,
    roomCode,
    setRoomCode,
    validationError,
    actionError,
    pending,
    createRoom,
    joinRoom
  };
}
