// Tells a database that cannot be reached apart from other errors, so callers can answer
// `database_unavailable` instead of `internal_error`, and a real bug is never hidden behind it.

import { DatabaseError } from "pg";

/** Network errors of the connection itself. */
const NETWORK_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "EPIPE"]);

/** Messages of the `pg` client when a connection or a query does not complete. */
const CLIENT_MESSAGES = [/^Connection terminated/, /^Query read timeout$/, /timeout exceeded when trying to connect/];

/**
 * SQLSTATE classes of a server that cannot serve the request: 08 connection exception, 53
 * insufficient resources, 57P operator intervention (for example a shutdown).
 */
function isUnavailableState(code: string | undefined): boolean {
  return code !== undefined && (code.startsWith("08") || code.startsWith("53") || code.startsWith("57P"));
}

export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof DatabaseError) {
    return isUnavailableState(error.code);
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return (typeof code === "string" && NETWORK_CODES.has(code)) || CLIENT_MESSAGES.some((pattern) => pattern.test(error.message));
}
