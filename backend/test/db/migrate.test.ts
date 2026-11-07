// Integration tests against a real PostgreSQL database. They run only when TEST_DATABASE_URL is set
// (backend/.env locally, a service container in CI) and drop the schema of that database.

import dotenv from "dotenv";
import { Client, DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadMigrations, migrate } from "../../src/db/migrate.js";

dotenv.config({ quiet: true });
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe("loadMigrations", () => {
  it("loads the migration files in order", () => {
    const versions = loadMigrations().map((migration) => migration.version);
    expect(versions[0]).toBe("0001_initial_schema");
    expect(versions).toEqual([...versions].sort());
  });
});

describe.skipIf(!testDatabaseUrl)("migrate (PostgreSQL)", () => {
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
});
