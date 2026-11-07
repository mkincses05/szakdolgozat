// The session of this browser tab: user ID, room code, and reconnect token (R23). It is kept in
// `sessionStorage`, so it survives a reload but every tab has its own player; with `localStorage`
// a second tab would resume the first tab's session and take over its connection.

import type { SessionInfo } from "@wildhand/shared";

const STORAGE_KEY = "wildhand.session";

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
  } catch {
    // Nothing is stored when storage is unavailable.
  }
}
