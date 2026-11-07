// The connection pool of the backend. The database is optional: without DATABASE_URL the server runs
// matches and stores nothing.

import { Pool } from "pg";
import type { Logger } from "../logger.js";

/**
 * An unreachable database must not keep a player waiting: a connection attempt or query that takes
 * longer fails, and the caller falls back (for example, the player connects as a guest).
 */
const DATABASE_TIMEOUT_MS = 5_000;

export function createPool(databaseUrl: string | null, logger: Logger): Pool | null {
  if (databaseUrl === null) {
    return null;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
    query_timeout: DATABASE_TIMEOUT_MS,
    statement_timeout: DATABASE_TIMEOUT_MS
  });
  // Without a listener, an error on an idle connection (for example a database restart) would crash the server.
  pool.on("error", (error) => logger.error("Idle database connection failed.", error));
  return pool;
}

/** Logs whether the database is reachable; an unreachable database never stops the server. */
export async function checkDatabase(pool: Pool | null, logger: Logger): Promise<void> {
  if (pool === null) {
    logger.info("No DATABASE_URL set; results are not stored.");
    return;
  }

  try {
    await pool.query("SELECT 1");
    logger.info("Connected to the database.");
  } catch (error) {
    logger.error("The database is not reachable; results are not stored until it is.", error);
  }
}
