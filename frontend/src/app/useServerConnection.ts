// Opens the shared socket, resumes the stored session on every (re)connect, and keeps the latest
// `room:state`, `game:state`, and `game:ended` received from the server.

import type { MatchResults, MatchView, RoomView, SessionInfo } from "@wildhand/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConnectionStatus, ServerStateValue } from "../hooks/useServerState";
import { resumeSession, type ActionErrorCode } from "../services/actions";
import {
  clearSession,
  loadDismissedMatchId,
  loadSession,
  saveDismissedMatchId,
  saveSession
} from "../services/session";
import type { Socket } from "socket.io-client";
import { socket } from "../services/socket";

const RESUME_RETRY_MS = 2_000;

export function useServerConnection(): ServerStateValue {
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [session, setSession] = useState<SessionInfo | null>(loadSession);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [match, setMatch] = useState<MatchView | null>(null);
  const [results, setResults] = useState<MatchResults | null>(null);
  const [dismissedMatchId, setDismissedMatchId] = useState<string | null>(loadDismissedMatchId);
  const [sessionError, setSessionError] = useState<ActionErrorCode | null>(null);

  const forgetSession = useCallback(() => {
    clearSession();
    setSession(null);
    setRoom(null);
    setMatch(null);
    setResults(null);
    setDismissedMatchId(null);
  }, []);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const resume = () => {
      const stored = loadSession();
      if (!stored) {
        return;
      }

      void resumeSession(stored.reconnectToken).then((ack) => {
        if (ack.ok) {
          saveSession(ack.data);
          setSession(ack.data);
          setSessionError(null);
          return;
        }
        setSessionError(ack.code);
        if (ack.code === "invalid_reconnect_token" || ack.code === "session_expired") {
          forgetSession();
        } else if (socket.connected) {
          // The server may still know the session (for example after a timeout), so try again.
          retryTimer = setTimeout(resume, RESUME_RETRY_MS);
        }
      });
    };

    const onConnect = () => {
      setConnection("connected");
      resume();
    };

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      clearTimeout(retryTimer);
      // The server disconnects a socket only when the same session connects from another tab.
      setConnection(reason === "io server disconnect" ? "replaced" : "reconnecting");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", setRoom);
    socket.on("game:state", setMatch);
    socket.on("game:ended", setResults);
    socket.connect();

    return () => {
      clearTimeout(retryTimer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", setRoom);
      socket.off("game:state", setMatch);
      socket.off("game:ended", setResults);
      socket.disconnect();
    };
  }, [forgetSession]);

  const startSession = useCallback((info: SessionInfo) => {
    saveSession(info);
    setSession(info);
    setSessionError(null);
  }, []);

  const endSession = useCallback(() => {
    forgetSession();
    setSessionError(null);
  }, [forgetSession]);

  const dismissResults = useCallback(() => {
    const matchId = results?.matchId ?? null;
    // Stored with the session, so a reload does not bring back results the player has closed.
    saveDismissedMatchId(matchId);
    setDismissedMatchId(matchId);
  }, [results]);

  return useMemo(
    () => ({
      connection,
      session,
      room,
      match,
      results,
      dismissedMatchId,
      sessionError,
      startSession,
      endSession,
      dismissResults
    }),
    [connection, session, room, match, results, dismissedMatchId, sessionError, startSession, endSession, dismissResults]
  );
}
