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
  // An ended match view is never shown as the game: when a new match starts, `room:state` arrives
  // before its first `game:state`, and the last view still belongs to the previous match.
  if (room.state === "in_match" && match && match.phase !== "ended") {
    return "game";
  }
  if (results && results.matchId !== dismissedMatchId) {
    return "results";
  }
  return room.state === "in_match" ? "loading" : "lobby";
}
