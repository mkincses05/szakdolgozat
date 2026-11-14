// Applies the SQL migrations in backend/migrations in order. Each file runs in its own transaction and
// is recorded in `schema_migrations`, so running the migrations again applies only the new files.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ClientBase } from "pg";

export interface Migration {
  /** The file name without `.sql`, for example `0001_initial_schema`. */
  version: string;
  sql: string;
}

export const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

const FILE_NAME = /^(\d{4}_[a-z0-9_]+)\.sql$/;

/** Arbitrary constant key, so that only one process migrates the database at a time. */
const ADVISORY_LOCK_KEY = 7_142_025;

export function loadMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => {
      const match = FILE_NAME.exec(name);
      if (!match) {
        throw new Error(`Invalid migration file name "${name}", expected for example "0002_add_column.sql"`);
      }
      return { version: match[1], sql: readFileSync(path.join(dir, name), "utf8") };
    });
}

/** Returns the versions applied by this run, in order. */
export async function migrate(client: ClientBase, migrations: readonly Migration[]): Promise<string[]> {
  await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.version));
    const newlyApplied: string[] = [];

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${migration.version} failed`, { cause: error });
      }
      newlyApplied.push(migration.version);
    }

    return newlyApplied;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
  }
}
