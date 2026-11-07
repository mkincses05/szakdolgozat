import { describe, expect, it } from "vitest";
import { DEFAULT_RECONNECT_GRACE_MS, DEFAULT_TURN_TIMEOUT_MS } from "@wildhand/shared";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("uses the defaults when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      corsOrigin: "*",
      turnTimeoutMs: DEFAULT_TURN_TIMEOUT_MS,
      reconnectGraceMs: DEFAULT_RECONNECT_GRACE_MS,
      databaseUrl: null
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
      turnTimeoutMs: 30_000,
      reconnectGraceMs: 1,
      databaseUrl: "postgres://wildhand_app:secret@localhost:5432/wildhand"
    });
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
