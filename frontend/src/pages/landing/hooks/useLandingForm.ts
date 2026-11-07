// Form state of the landing page: validates the inputs with the shared schemas, then creates or
// joins a room and starts the session returned by the server.

import { displayNameSchema, roomCodeSchema } from "@wildhand/shared";
import { useState } from "react";
import { useServerState } from "../../../hooks/useServerState";
import { sendAction, type ActionErrorCode, type ActionResult } from "../../../services/actions";

export type LandingValidationError = "displayName" | "roomCode";

export function useLandingForm() {
  const { startSession } = useServerState();
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [validationError, setValidationError] = useState<LandingValidationError | null>(null);
  const [actionError, setActionError] = useState<ActionErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  /** Returns the trimmed name, or `null` after showing the validation error. */
  const validName = (): string | null => {
    setValidationError(null);
    setActionError(null);
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      setValidationError("displayName");
      return null;
    }
    return parsed.data;
  };

  const enter = async (request: Promise<ActionResult<"room:create" | "room:join">>) => {
    setPending(true);
    const ack = await request;
    setPending(false);
    if (ack.ok) {
      startSession(ack.data);
    } else {
      setActionError(ack.code);
    }
  };

  const createRoom = () => {
    const name = validName();
    if (name !== null) {
      void enter(sendAction("room:create", { displayName: name }));
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
    void enter(sendAction("room:join", { roomCode: code.data, displayName: name }));
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
