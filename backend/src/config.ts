import { DEFAULT_RECONNECT_GRACE_MS, DEFAULT_TURN_TIMEOUT_MS } from "@wildhand/shared";

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  /** R22 */
  turnTimeoutMs: number;
  /** R23 */
  reconnectGraceMs: number;
}

function integer(value: string | undefined, fallback: number, name: string, min: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${name} must be an integer of at least ${min}, got "${value}"`);
  }

  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    // 0 lets the operating system pick a free port.
    port: integer(env.PORT, 3000, "PORT", 0),
    corsOrigin: env.CORS_ORIGIN || "*",
    // A zero timer would end every turn, or forfeit every disconnect, immediately.
    turnTimeoutMs: integer(env.TURN_TIMEOUT_MS, DEFAULT_TURN_TIMEOUT_MS, "TURN_TIMEOUT_MS", 1),
    reconnectGraceMs: integer(env.RECONNECT_GRACE_MS, DEFAULT_RECONNECT_GRACE_MS, "RECONNECT_GRACE_MS", 1)
  };
}
