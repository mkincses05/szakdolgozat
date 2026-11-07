// Selects the visible page from the latest server state; there is no URL routing.

import type { ServerState } from "../hooks/useServerState";

export type PageId = "landing" | "loading" | "lobby" | "game" | "results";

export function selectPage(state: Pick<ServerState, "session" | "room" | "match" | "results" | "dismissedMatchId">): PageId {
  const { session, room, match, results, dismissedMatchId } = state;

  if (!session) {
    return "landing";
  }
  // The session is being resumed, or the first `room:state` has not arrived yet.
  if (!room) {
    return "loading";
  }
  if (room.state === "in_match") {
    return match ? "game" : "loading";
  }
  if (results && results.matchId !== dismissedMatchId) {
    return "results";
  }
  return "lobby";
}
