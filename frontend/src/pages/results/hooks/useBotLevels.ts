// Bot levels of the match players, from the last match view of the same match or from the room
// members; `null` for human players.

import type { BotLevel } from "@wildhand/shared";
import { useCallback } from "react";
import { useServerState } from "../../../hooks/useServerState";

export function useBotLevels(matchId: string): (userId: string) => BotLevel | null {
  const { match, room } = useServerState();

  return useCallback(
    (userId: string) => {
      const player = match?.matchId === matchId ? match.players.find((p) => p.userId === userId) : undefined;
      return player?.botLevel ?? room?.members.find((member) => member.userId === userId)?.botLevel ?? null;
    },
    [match, room, matchId]
  );
}
