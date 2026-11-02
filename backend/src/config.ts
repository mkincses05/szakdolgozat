import { DEFAULT_RECONNECT_GRACE_MS, DEFAULT_TURN_TIMEOUT_MS } from "@wildhand/shared";

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  /** R22 */
  turnTimeoutMs: number;
  /** R23 */
  reconnectGraceMs: number;
}

function positiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${value}"`);
  }

  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: positiveInt(env.PORT, 3000, "PORT"),
    corsOrigin: env.CORS_ORIGIN || "*",
    turnTimeoutMs: positiveInt(env.TURN_TIMEOUT_MS, DEFAULT_TURN_TIMEOUT_MS, "TURN_TIMEOUT_MS"),
    reconnectGraceMs: positiveInt(env.RECONNECT_GRACE_MS, DEFAULT_RECONNECT_GRACE_MS, "RECONNECT_GRACE_MS")
  };
}
