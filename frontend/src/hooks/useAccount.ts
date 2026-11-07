// The logged-in account and the guest choice, shared with every page through a context. The profile
// always comes from the server; it is fetched again instead of being changed locally.

import type { AccountProfile, LoginPayload, RegisterPayload } from "@wildhand/shared";
import { createContext, useContext } from "react";
import type { ActionErrorCode } from "../services/actions";
import type { AccountResult } from "../services/account";

/**
 * `loading`: the first profile request is running. `unavailable`: the server cannot handle accounts
 * right now (for example without a database); playing as a guest still works.
 */
export type AccountStatus = "loading" | "loggedIn" | "loggedOut" | "unavailable";

export interface AccountState {
  status: AccountStatus;
  profile: AccountProfile | null;
  /** Why accounts are unavailable. */
  unavailableReason: ActionErrorCode | null;
  /** Local UI state: the player chose to continue as a guest on the welcome page. */
  continuedAsGuest: boolean;
}

export interface AccountValue extends AccountState {
  login: (payload: LoginPayload) => Promise<AccountResult<AccountProfile>>;
  register: (payload: RegisterPayload) => Promise<AccountResult<AccountProfile>>;
  /** Logs out only when the server confirms it, so a still valid cookie is never left behind. */
  logout: () => Promise<AccountResult>;
  /** Fetches the profile again, for example after a match changed the XP. */
  refresh: () => Promise<void>;
  continueAsGuest: () => void;
  /** Returns a guest to the welcome page to log in or register. */
  showWelcome: () => void;
}

export const AccountContext = createContext<AccountValue | null>(null);

export function useAccount(): AccountValue {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error("useAccount must be used inside AccountProvider");
  }
  return value;
}
