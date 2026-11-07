// Experience points of registered players (docs/03 section 2). Guests and bots earn no XP.

import type { Standing } from "./results.js";

export const XP_FOR_MATCH = 10;
export const XP_PER_PLAYER_BEHIND = 10;

/**
 * XP for one finished match: a fixed amount for taking part plus a bonus for every player who
 * finished behind. Players who share a position after a blocked game are not behind each other.
 * A forfeit earns nothing.
 */
export function getMatchXp(standing: Standing, standings: readonly Standing[]): number {
  if (standing.matchStatus === "forfeited") {
    return 0;
  }

  const playersBehind = standings.filter((other) => other.position > standing.position).length;
  return XP_FOR_MATCH + playersBehind * XP_PER_PLAYER_BEHIND;
}
