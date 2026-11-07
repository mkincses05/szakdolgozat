// Selects the visible page from the latest server state; there is no URL routing.

import type { AccountState } from "../hooks/useAccount";
import type { ServerState } from "../hooks/useServerState";

export type PageId = "welcome" | "landing" | "loading" | "lobby" | "game" | "results";

export function selectPage(
  state: Pick<ServerState, "session" | "room" | "match" | "results" | "dismissedMatchId">,
  account: Pick<AccountState, "status" | "continuedAsGuest">
): PageId {
  const { session, room, match, results, dismissedMatchId } = state;

  // Outside a room the account decides: the welcome page asks to log in, register, or continue as
  // a guest. A player in a room (for example after a reload) goes straight back to it.
  // A guest does not wait for the profile request.
  if (!session) {
    if (account.status === "loggedIn" || account.continuedAsGuest) {
      return "landing";
    }
    return account.status === "loading" ? "loading" : "welcome";
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
