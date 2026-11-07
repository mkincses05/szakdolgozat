// Stores the result of a match (docs/03 section 2): the statistics log in `matches` and
// `match_players`, and the authoritative counters of registered users, in one transaction.

import type { MatchEndReason, MatchStatus } from "@wildhand/shared";
import type { Pool } from "pg";

export type PlayerKind = "guest" | "registered" | "bot";

export interface MatchRecordPlayer {
  seat: number;
  kind: PlayerKind;
  /** The registered user's ID; `null` for guests and bots. */
  accountId: string | null;
  displayName: string;
  finalStatus: MatchStatus;
  /** `null` only for players who were still playing when the match was aborted. */
  finishPosition: number | null;
  xpEarned: number;
}

export interface MatchRecord {
  seed: number;
  turnTimeoutMs: number;
  startedAt: Date;
  endedAt: Date;
  endReason: MatchEndReason | "aborted";
  winnerSeat: number | null;
  /** In seat order. */
  players: MatchRecordPlayer[];
}

export interface MatchResultStore {
  save(record: MatchRecord): Promise<void>;
}

/** Used when the server runs without a database. */
export const noopMatchResultStore: MatchResultStore = {
  save: async () => {}
};

export function createPgMatchResultStore(pool: Pool): MatchResultStore {
  return {
    async save(record) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO matches (seed, player_count, turn_timeout_ms, started_at, ended_at, end_reason, winner_seat)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            String(record.seed),
            record.players.length,
            record.turnTimeoutMs,
            record.startedAt,
            record.endedAt,
            record.endReason,
            record.winnerSeat
          ]
        );
        const matchId = rows[0].id;

        const columns = 8;
        const values = record.players.flatMap((player) => [
          matchId,
          player.seat,
          player.kind,
          player.accountId,
          player.displayName,
          player.finalStatus,
          player.finishPosition,
          player.xpEarned
        ]);
        const placeholders = record.players
          .map((_player, row) => `(${Array.from({ length: columns }, (_, column) => `$${row * columns + column + 1}`).join(", ")})`)
          .join(", ");
        await client.query(
          `INSERT INTO match_players
             (match_id, seat, player_kind, user_id, display_name, final_status, finish_position, xp_earned)
           VALUES ${placeholders}`,
          values
        );

        // An aborted match is only logged; it changes no counter.
        if (record.endReason !== "aborted") {
          for (const player of record.players) {
            if (player.kind !== "registered" || player.accountId === null) {
              continue;
            }
            const won = player.finishPosition === 1 && player.finalStatus !== "forfeited";
            const forfeited = player.finalStatus === "forfeited";
            // Increased in SQL, never read and written back, so concurrent matches cannot lose updates.
            await client.query(
              `UPDATE users
               SET xp = xp + $2,
                   matches_played = matches_played + 1,
                   wins = wins + $3,
                   forfeits = forfeits + $4,
                   last_seen_at = now()
               WHERE id = $1`,
              [player.accountId, player.xpEarned, won ? 1 : 0, forfeited ? 1 : 0]
            );
          }
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
