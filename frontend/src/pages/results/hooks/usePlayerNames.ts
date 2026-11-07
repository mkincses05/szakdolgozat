// Display names for the results: from the last match view of the same match, which lists every
// match player, or from the room members.

import { useCallback } from "react";
import { useServerState } from "../../../hooks/useServerState";

export function usePlayerNames(matchId: string): (userId: string) => string {
  const { match, room } = useServerState();

  return useCallback(
    (userId: string) => {
      const player = match?.matchId === matchId ? match.players.find((p) => p.userId === userId) : undefined;
      return player?.displayName ?? room?.members.find((member) => member.userId === userId)?.displayName ?? userId;
    },
    [match, room, matchId]
  );
}
