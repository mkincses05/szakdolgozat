// The latest room and match state received from the server, shared with every page through a
// context. Pages render this state only; they never keep their own copy of the match.

import type { MatchResults, MatchView, RoomView, SessionInfo } from "@wildhand/shared";
import { createContext, useContext } from "react";
import type { ActionErrorCode } from "../services/actions";

/** `replaced`: the server closed the connection because the session was opened in another tab. */
export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "replaced";

export interface ServerState {
  connection: ConnectionStatus;
  session: SessionInfo | null;
  room: RoomView | null;
  match: MatchView | null;
  results: MatchResults | null;
  /** Local UI state: the results the player has already closed. */
  dismissedMatchId: string | null;
  /** Why the stored session could not be resumed. */
  sessionError: ActionErrorCode | null;
}

export interface ServerStateValue extends ServerState {
  /** Stores the session returned by `room:create` or `room:join`. */
  startSession: (session: SessionInfo) => void;
  /** Forgets the session after `room:leave`. */
  endSession: () => void;
  dismissResults: () => void;
}

export const ServerStateContext = createContext<ServerStateValue | null>(null);

export function useServerState(): ServerStateValue {
  const value = useContext(ServerStateContext);
  if (!value) {
    throw new Error("useServerState must be used inside ServerStateProvider");
  }
  return value;
}
