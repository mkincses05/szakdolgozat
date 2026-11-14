// The session of this browser tab: user ID, room code, and reconnect token (R23). It is kept in
// `sessionStorage`, so it survives a reload but every tab has its own player; with `localStorage`
// a second tab would resume the first tab's session and take over its connection.

import type { SessionInfo } from "@wildhand/shared";

const STORAGE_KEY = "wildhand.session";
const DISMISSED_RESULTS_KEY = "wildhand.dismissedResults";

function isSessionInfo(value: unknown): value is SessionInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { userId, roomCode, reconnectToken } = value as Record<string, unknown>;
  return typeof userId === "string" && typeof roomCode === "string" && typeof reconnectToken === "string";
}

export function loadSession(): SessionInfo | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored === null ? null : JSON.parse(stored);
    return isSessionInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionInfo): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Without storage the session still works until the page is reloaded.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(DISMISSED_RESULTS_KEY);
  } catch {
    // Nothing is stored when storage is unavailable.
  }
}

/** The match whose results the player has closed; the server resends them after a reload. */
export function loadDismissedMatchId(): string | null {
  try {
    return sessionStorage.getItem(DISMISSED_RESULTS_KEY);
  } catch {
    return null;
  }
}

export function saveDismissedMatchId(matchId: string | null): void {
  try {
    if (matchId === null) {
      sessionStorage.removeItem(DISMISSED_RESULTS_KEY);
    } else {
      sessionStorage.setItem(DISMISSED_RESULTS_KEY, matchId);
    }
  } catch {
    // Without storage the closed results come back after a reload.
  }
}

const GUEST_CHOICE_KEY = "wildhand.continueAsGuest";

/** Whether the player chose to play as a guest on the welcome page; asked again in a new tab. */
export function loadGuestChoice(): boolean {
  try {
    return sessionStorage.getItem(GUEST_CHOICE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveGuestChoice(guest: boolean): void {
  try {
    if (guest) {
      sessionStorage.setItem(GUEST_CHOICE_KEY, "true");
    } else {
      sessionStorage.removeItem(GUEST_CHOICE_KEY);
    }
  } catch {
    // Without storage the welcome page comes back after a reload.
  }
}
