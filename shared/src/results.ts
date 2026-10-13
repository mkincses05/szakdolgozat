// Final match results sent with `game:ended` (R18, R20, R21, R23).

import type { MatchEndReason, MatchStatus } from "./status.js";

export interface Standing {
  userId: string;
  /** Players who share a position in a blocked game (R18) have the same value. */
  position: number;
  matchStatus: MatchStatus;
}

export interface MatchResults {
  matchId: string;
  endReason: MatchEndReason;
  winnerId: string;
  /** Ordered by position. */
  standings: Standing[];
}
