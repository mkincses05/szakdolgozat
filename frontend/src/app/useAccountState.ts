// Loads the account behind the login cookie and handles login, registration, and logout. The
// server reads the cookie only when the socket connects, so the socket reconnects after every
// change of the account.

import type { AccountProfile, LoginPayload, RegisterPayload } from "@wildhand/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountStatus, AccountValue } from "../hooks/useAccount";
import { useServerState } from "../hooks/useServerState";
import * as accountApi from "../services/account";
import type { AccountResult } from "../services/account";
import type { ActionErrorCode } from "../services/actions";
import { loadGuestChoice, saveGuestChoice } from "../services/session";
import { socket } from "../services/socket";

function reconnectSocket(): void {
  socket.disconnect();
  socket.connect();
}

export function useAccountState(): AccountValue {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<ActionErrorCode | null>(null);
  const [continuedAsGuest, setContinuedAsGuest] = useState(loadGuestChoice);

  const refresh = useCallback(async () => {
    const result = await accountApi.fetchProfile();
    if (result.ok) {
      setProfile(result.data);
      setStatus("loggedIn");
      setUnavailableReason(null);
    } else if (result.code === "not_logged_in") {
      setProfile(null);
      setStatus("loggedOut");
      setUnavailableReason(null);
    } else {
      setProfile(null);
      setStatus("unavailable");
      setUnavailableReason(result.code);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A match changes the XP and the counters, so the profile is fetched again when the player
  // leaves the room.
  const { session } = useServerState();
  const hadSession = useRef(session !== null);
  useEffect(() => {
    if (hadSession.current && session === null) {
      void refresh();
    }
    hadSession.current = session !== null;
  }, [session, refresh]);

  const signIn = useCallback(
    async (request: () => Promise<AccountResult<AccountProfile>>) => {
      const result = await request();
      if (result.ok) {
        setProfile(result.data);
        setStatus("loggedIn");
        reconnectSocket();
      }
      return result;
    },
    []
  );

  const login = useCallback((payload: LoginPayload) => signIn(() => accountApi.login(payload)), [signIn]);
  const register = useCallback((payload: RegisterPayload) => signIn(() => accountApi.register(payload)), [signIn]);

  const logout = useCallback(async () => {
    const result = await accountApi.logout();
    if (!result.ok) {
      return result;
    }
    setProfile(null);
    setStatus("loggedOut");
    saveGuestChoice(false);
    setContinuedAsGuest(false);
    reconnectSocket();
    return result;
  }, []);

  const continueAsGuest = useCallback(() => {
    saveGuestChoice(true);
    setContinuedAsGuest(true);
  }, []);

  const showWelcome = useCallback(() => {
    saveGuestChoice(false);
    setContinuedAsGuest(false);
  }, []);

  return useMemo(
    () => ({
      status,
      profile,
      unavailableReason,
      continuedAsGuest,
      login,
      register,
      logout,
      refresh,
      continueAsGuest,
      showWelcome
    }),
    [status, profile, unavailableReason, continuedAsGuest, login, register, logout, refresh, continueAsGuest, showWelcome]
  );
}
