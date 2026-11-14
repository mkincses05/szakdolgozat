import { DEFAULT_RECONNECT_GRACE_MS, DEFAULT_TURN_TIMEOUT_MS } from "@wildhand/shared";
import { DEFAULT_BOT_SETTINGS, type BotSettings } from "./game/bot-driver.js";

export interface ServerConfig {
  port: number;
  /** The frontend origin; the login cookie requires an exact origin instead of `*`. */
  corsOrigin: string;
  /** Sends the login cookie only over HTTPS; on in production. */
  secureCookies: boolean;
  /** R22 */
  turnTimeoutMs: number;
  /** R23 */
  reconnectGraceMs: number;
  /** Connection of the backend role; `null` runs the server without a database. */
  databaseUrl: string | null;
  /** Thinking times of computer players (docs/03 section 3). */
  bots: BotSettings;
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

function origin(value: string | undefined): string {
  if (value === "*") {
    throw new Error("CORS_ORIGIN must be the exact frontend origin, for example http://localhost:5173, not *");
  }
  return value || "http://localhost:5173";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    // 0 lets the operating system pick a free port.
    port: integer(env.PORT, 3000, "PORT", 0),
    corsOrigin: origin(env.CORS_ORIGIN),
    secureCookies: env.NODE_ENV === "production",
    // A zero timer would end every turn, or forfeit every disconnect, immediately.
    turnTimeoutMs: integer(env.TURN_TIMEOUT_MS, DEFAULT_TURN_TIMEOUT_MS, "TURN_TIMEOUT_MS", 1),
    reconnectGraceMs: integer(env.RECONNECT_GRACE_MS, DEFAULT_RECONNECT_GRACE_MS, "RECONNECT_GRACE_MS", 1),
    databaseUrl: env.DATABASE_URL || null,
    bots: botSettings(env)
  };
}

function botSettings(env: NodeJS.ProcessEnv): BotSettings {
  const { thinkDelay, samplingBudgetMs, samplingWorkers } = DEFAULT_BOT_SETTINGS;
  const minMs = integer(env.BOT_THINK_MIN_MS, thinkDelay.minMs, "BOT_THINK_MIN_MS", 0);
  const maxMs = integer(env.BOT_THINK_MAX_MS, Math.max(minMs, thinkDelay.maxMs), "BOT_THINK_MAX_MS", minMs);
  return {
    thinkDelay: { minMs, maxMs },
    samplingBudgetMs: integer(env.BOT_SAMPLING_BUDGET_MS, samplingBudgetMs, "BOT_SAMPLING_BUDGET_MS", 1),
    samplingWorkers: integer(env.BOT_SAMPLING_WORKERS, samplingWorkers, "BOT_SAMPLING_WORKERS", 0)
  };
}
