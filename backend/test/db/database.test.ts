// Integration tests against a real PostgreSQL database. They run only when TEST_DATABASE_URL is set
// (backend/.env locally, a service container in CI) and drop the schema of that database.

import dotenv from "dotenv";
import { Client, DatabaseError, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadMigrations, migrate } from "../../src/db/migrate.js";
import { createPgMatchResultStore, type MatchRecord } from "../../src/persistence/match-result-store.js";

dotenv.config({ quiet: true });
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe("loadMigrations", () => {
  it("loads the migration files in order", () => {
    const versions = loadMigrations().map((migration) => migration.version);
    expect(versions[0]).toBe("0001_initial_schema");
    expect(versions).toEqual([...versions].sort());
  });
});

describe.skipIf(!testDatabaseUrl)("PostgreSQL", () => {
  const client = new Client({ connectionString: testDatabaseUrl });

  async function sqlState(run: () => Promise<unknown>): Promise<string | undefined> {
    try {
      await run();
      return undefined;
    } catch (error) {
      return error instanceof DatabaseError ? error.code : String(error);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
    }
  }

  /** Runs statements as the restricted backend role inside a transaction that is rolled back. */
  async function asApp(sql: string, values: unknown[] = []): Promise<void> {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE wildhand_app");
    await client.query(sql, values);
  }

  async function insertMatch(): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO matches (seed, player_count, turn_timeout_ms, started_at, ended_at, end_reason, winner_seat)
       VALUES ('42', 2, 30000, now(), now(), 'last_player', 0) RETURNING id`
    );
    return rows[0].id;
  }

  beforeAll(async () => {
    await client.connect();
    const { rows } = await client.query<{ name: string }>("SELECT current_database() AS name");
    if (!rows[0].name.endsWith("_test")) {
      throw new Error(`Refusing to reset "${rows[0].name}": TEST_DATABASE_URL must point to a database ending in _test`);
    }

    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
  });

  afterAll(async () => {
    await client.end();
  });

  it("applies every migration once", async () => {
    const migrations = loadMigrations();
    expect(await migrate(client, migrations)).toEqual(migrations.map((migration) => migration.version));
    expect(await migrate(client, migrations)).toEqual([]);

    const { rows } = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    expect(rows.map((row) => row.table_name)).toEqual([
      "auth_sessions",
      "match_players",
      "matches",
      "schema_migrations",
      "user_credentials",
      "users"
    ]);
  });

  it("rolls back a failing migration and does not record it", async () => {
    const failing = [{ version: "9999_failing", sql: "CREATE TABLE half_done (id int); SELECT 1 / 0;" }];
    await expect(migrate(client, failing)).rejects.toThrow("Migration 9999_failing failed");

    const { rows } = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version = '9999_failing' UNION ALL SELECT 1 FROM pg_tables WHERE tablename = 'half_done'"
    );
    expect(rows).toEqual([]);
  });

  it("lets the backend role only append to the match log", async () => {
    const matchId = await insertMatch();

    expect(
      await sqlState(() =>
        asApp(
          `INSERT INTO matches (seed, player_count, turn_timeout_ms, started_at, ended_at, end_reason)
           VALUES ('7', 3, 30000, now(), now(), 'aborted')`
        )
      )
    ).toBeUndefined();
    // 42501: insufficient_privilege
    expect(await sqlState(() => asApp("DELETE FROM matches WHERE id = $1", [matchId]))).toBe("42501");
    expect(await sqlState(() => asApp("UPDATE match_players SET xp_earned = 1"))).toBe("42501");
    expect(await sqlState(() => asApp("TRUNCATE users"))).toBe("42501");
  });

  it("rejects XP and user IDs for guests and bots without a level", async () => {
    const matchId = await insertMatch();
    const insertPlayer = (kind: string, botLevel: string | null, xp: number) =>
      sqlState(async () => {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO match_players (match_id, seat, player_kind, bot_level, display_name, final_status, finish_position, xp_earned)
           VALUES ($1, 0, $2, $3, 'Anna', 'finished', 1, $4)`,
          [matchId, kind, botLevel, xp]
        );
      });

    // 23514: check_violation
    expect(await insertPlayer("guest", null, 0)).toBeUndefined();
    expect(await insertPlayer("guest", null, 10)).toBe("23514");
    expect(await insertPlayer("bot", null, 0)).toBe("23514");
    expect(await insertPlayer("bot", "heuristic", 0)).toBeUndefined();
  });

  it("keeps usernames and emails unique regardless of case", async () => {
    await client.query(
      "INSERT INTO users (username, email, display_name) VALUES ('Anna', 'anna@example.com', 'Anna')"
    );
    // 23505: unique_violation
    expect(
      await sqlState(() =>
        client.query("INSERT INTO users (username, email, display_name) VALUES ('anna', 'other@example.com', 'Anna')")
      )
    ).toBe("23505");
    expect(
      await sqlState(() =>
        client.query("INSERT INTO users (username, email, display_name) VALUES ('Bella', 'ANNA@example.com', 'Bella')")
      )
    ).toBe("23505");
  });

  describe("match result store", () => {
    // The store runs with the restricted backend role, as in production.
    const appPool = new Pool({ connectionString: testDatabaseUrl, options: "-c role=wildhand_app" });
    const store = createPgMatchResultStore(appPool);

    afterAll(async () => {
      await appPool.end();
    });

    async function createUser(username: string): Promise<string> {
      const { rows } = await client.query<{ id: string }>(
        "INSERT INTO users (username, email, display_name) VALUES ($1, $2, $1) RETURNING id",
        [username, `${username}@example.com`]
      );
      return rows[0].id;
    }

    async function counters(userId: string) {
      const { rows } = await client.query(
        "SELECT xp::int, matches_played, wins, forfeits FROM users WHERE id = $1",
        [userId]
      );
      return rows[0];
    }

    async function matchCount(): Promise<number> {
      const { rows } = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM matches");
      return rows[0].count;
    }

    function record(overrides: Partial<MatchRecord>, players: MatchRecord["players"]): MatchRecord {
      return {
        seed: 123,
        turnTimeoutMs: 30_000,
        startedAt: new Date("2026-11-07T10:00:00Z"),
        endedAt: new Date("2026-11-07T10:05:00Z"),
        endReason: "last_player",
        winnerSeat: 0,
        players,
        ...overrides
      };
    }

    const player = (
      seat: number,
      fields: Partial<MatchRecord["players"][number]>
    ): MatchRecord["players"][number] => ({
      seat,
      kind: "guest",
      accountId: null,
      displayName: `Player ${seat + 1}`,
      finalStatus: "finished",
      finishPosition: seat + 1,
      xpEarned: 0,
      ...fields
    });

    it("writes the log and updates the counters of registered players", async () => {
      const winner = await createUser("Winner");
      const quitter = await createUser("Quitter");

      await store.save(
        record({ endReason: "forfeits" }, [
          player(0, { kind: "registered", accountId: winner, xpEarned: 30 }),
          player(1, { finishPosition: 2 }),
          player(2, { kind: "registered", accountId: quitter, finalStatus: "forfeited", finishPosition: 3 })
        ])
      );

      const { rows: matches } = await client.query(
        "SELECT seed, player_count, turn_timeout_ms, end_reason, winner_seat FROM matches ORDER BY id DESC LIMIT 1"
      );
      expect(matches).toEqual([
        { seed: "123", player_count: 3, turn_timeout_ms: 30_000, end_reason: "forfeits", winner_seat: 0 }
      ]);

      const { rows: players } = await client.query(
        `SELECT seat, player_kind, user_id, final_status, finish_position, xp_earned
         FROM match_players WHERE match_id = (SELECT max(id) FROM matches) ORDER BY seat`
      );
      expect(players).toEqual([
        { seat: 0, player_kind: "registered", user_id: winner, final_status: "finished", finish_position: 1, xp_earned: 30 },
        { seat: 1, player_kind: "guest", user_id: null, final_status: "finished", finish_position: 2, xp_earned: 0 },
        { seat: 2, player_kind: "registered", user_id: quitter, final_status: "forfeited", finish_position: 3, xp_earned: 0 }
      ]);

      expect(await counters(winner)).toEqual({ xp: 30, matches_played: 1, wins: 1, forfeits: 0 });
      expect(await counters(quitter)).toEqual({ xp: 0, matches_played: 1, wins: 0, forfeits: 1 });
    });

    it("logs an aborted match without positions and changes no counter", async () => {
      const userId = await createUser("Aborted");

      await store.save(
        record({ endReason: "aborted", winnerSeat: null }, [
          player(0, { kind: "registered", accountId: userId, finalStatus: "active", finishPosition: null }),
          player(1, { finalStatus: "forfeited", finishPosition: null })
        ])
      );

      const { rows } = await client.query(
        "SELECT finish_position FROM match_players WHERE match_id = (SELECT max(id) FROM matches) ORDER BY seat"
      );
      expect(rows).toEqual([{ finish_position: null }, { finish_position: null }]);
      expect(await counters(userId)).toEqual({ xp: 0, matches_played: 0, wins: 0, forfeits: 0 });
    });

    it("writes nothing when any part of the result is invalid", async () => {
      const userId = await createUser("Rollback");
      const before = await matchCount();

      // A guest cannot earn XP, so the second insert fails after the match row was written.
      await expect(
        store.save(
          record({}, [
            player(0, { kind: "registered", accountId: userId, xpEarned: 20 }),
            player(1, { xpEarned: 10 })
          ])
        )
      ).rejects.toThrow();

      expect(await matchCount()).toBe(before);
      expect(await counters(userId)).toEqual({ xp: 0, matches_played: 0, wins: 0, forfeits: 0 });
    });

    it("requires a position for every finished player", async () => {
      await expect(
        store.save(record({}, [player(0, { finishPosition: null }), player(1, {})]))
      ).rejects.toMatchObject({ code: "23514" });
    });
  });
});
