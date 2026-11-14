import { describe, expect, it } from "vitest";
import { DEFAULT_RECONNECT_GRACE_MS, DEFAULT_TURN_TIMEOUT_MS } from "@wildhand/shared";
import { loadConfig } from "../src/config.js";
import { DEFAULT_BOT_SETTINGS } from "../src/game/bot-driver.js";

describe("loadConfig", () => {
  it("uses the defaults when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      corsOrigin: "http://localhost:5173",
      secureCookies: false,
      turnTimeoutMs: DEFAULT_TURN_TIMEOUT_MS,
      reconnectGraceMs: DEFAULT_RECONNECT_GRACE_MS,
      databaseUrl: null,
      bots: DEFAULT_BOT_SETTINGS
    });
  });

  it("reads the values from the environment", () => {
    expect(
      loadConfig({
        PORT: "0",
        CORS_ORIGIN: "http://localhost:5173",
        TURN_TIMEOUT_MS: "30000",
        RECONNECT_GRACE_MS: "1",
        DATABASE_URL: "postgres://wildhand_app:secret@localhost:5432/wildhand"
      })
    ).toEqual({
      port: 0,
      corsOrigin: "http://localhost:5173",
      secureCookies: false,
      turnTimeoutMs: 30_000,
      reconnectGraceMs: 1,
      databaseUrl: "postgres://wildhand_app:secret@localhost:5432/wildhand",
      bots: DEFAULT_BOT_SETTINGS
    });
  });

  it("reads the bot thinking times and keeps the maximum above the minimum", () => {
    expect(
      loadConfig({ BOT_THINK_MIN_MS: "0", BOT_THINK_MAX_MS: "0", BOT_SAMPLING_BUDGET_MS: "50" }).bots
    ).toEqual({ thinkDelay: { minMs: 0, maxMs: 0 }, samplingBudgetMs: 50, samplingWorkers: DEFAULT_BOT_SETTINGS.samplingWorkers });
    expect(loadConfig({ BOT_SAMPLING_WORKERS: "0" }).bots.samplingWorkers).toBe(0);
    expect(loadConfig({ BOT_THINK_MIN_MS: "2000" }).bots.thinkDelay).toEqual({ minMs: 2000, maxMs: 2000 });
    expect(() => loadConfig({ BOT_THINK_MIN_MS: "500", BOT_THINK_MAX_MS: "100" })).toThrow("BOT_THINK_MAX_MS");
  });

  it("requires an exact CORS origin and secure cookies in production", () => {
    expect(() => loadConfig({ CORS_ORIGIN: "*" })).toThrow("CORS_ORIGIN");
    expect(loadConfig({ NODE_ENV: "production" }).secureCookies).toBe(true);
  });

  it("runs without a database when DATABASE_URL is empty", () => {
    expect(loadConfig({ DATABASE_URL: "" }).databaseUrl).toBeNull();
  });

  it("rejects timers of zero (R22, R23) and invalid numbers", () => {
    expect(() => loadConfig({ TURN_TIMEOUT_MS: "0" })).toThrow("TURN_TIMEOUT_MS");
    expect(() => loadConfig({ RECONNECT_GRACE_MS: "0" })).toThrow("RECONNECT_GRACE_MS");
    expect(() => loadConfig({ TURN_TIMEOUT_MS: "1.5" })).toThrow("TURN_TIMEOUT_MS");
    expect(() => loadConfig({ PORT: "-1" })).toThrow("PORT");
    expect(() => loadConfig({ PORT: "abc" })).toThrow("PORT");
  });
});
