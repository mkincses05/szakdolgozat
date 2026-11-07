// The account API over HTTP and the login cookie on a Socket.IO connection, without a database.

import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { io as connect } from "socket.io-client";
import type { RoomView, SessionInfo } from "@wildhand/shared";
import { createWildhandServer, type WildhandApp } from "../../src/app.js";
import type { AccountStore } from "../../src/auth/account-store.js";
import { silentLogger } from "../game/helpers.js";
import { MemoryAccountStore } from "../auth/memory-account-store.js";

const ORIGIN = "http://localhost:5173";
const anna = { username: "anna_k", email: "anna@example.com", displayName: "Anna", password: "correct horse" };

let app: WildhandApp | null = null;

afterEach(async () => {
  await app?.close();
  app = null;
});

async function start(accounts: AccountStore | null = new MemoryAccountStore()): Promise<string> {
  app = createWildhandServer(
    { port: 0, corsOrigin: ORIGIN, secureCookies: false, turnTimeoutMs: 60_000, reconnectGraceMs: 5_000, databaseUrl: null },
    { logger: silentLogger, accounts }
  );
  await new Promise<void>((resolve) => app!.httpServer.listen(0, resolve));
  return `http://localhost:${(app.httpServer.address() as AddressInfo).port}`;
}

function post(url: string, body: unknown, cookie?: string) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

/** The `name=value` part of the Set-Cookie header, as a browser would send it back. */
function cookieOf(response: Response): string {
  return response.headers.get("set-cookie")!.split(";")[0];
}

describe("account API", () => {
  it("registers, sets an HttpOnly cookie, returns the profile, and logs out", async () => {
    const base = await start();

    const registered = await post(`${base}/api/auth/register`, anna);
    expect(registered.status).toBe(201);
    expect(registered.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(registered.headers.get("access-control-allow-credentials")).toBe("true");
    expect(registered.headers.get("set-cookie")).toMatch(/^wildhand_session=[\w-]+; Path=\/; Max-Age=2592000; HttpOnly; SameSite=Lax$/);
    const body = await registered.json();
    expect(body).toMatchObject({ ok: true, data: { username: "anna_k", displayName: "Anna", xp: 0 } });
    expect(JSON.stringify(body)).not.toContain(anna.password);

    const cookie = cookieOf(registered);
    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(await me.json()).toMatchObject({ ok: true, data: { email: "anna@example.com" } });

    const loggedOut = await post(`${base}/api/auth/logout`, {}, cookie);
    expect(loggedOut.headers.get("set-cookie")).toContain("Max-Age=0");
    const after = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(after.status).toBe(401);
    expect(await after.json()).toEqual({ ok: false, code: "not_logged_in" });
  });

  it("answers with error codes and fitting statuses", async () => {
    const base = await start();
    await post(`${base}/api/auth/register`, anna);

    const cases: [Response, number, string][] = [
      [await post(`${base}/api/auth/register`, { ...anna, email: "other@example.com" }), 409, "username_taken"],
      [await post(`${base}/api/auth/register`, { ...anna, password: "short" }), 400, "invalid_payload"],
      [await post(`${base}/api/auth/login`, "{not json"), 400, "invalid_payload"],
      [await post(`${base}/api/auth/login`, { login: "anna_k", password: "wrong password" }), 401, "invalid_credentials"],
      [await fetch(`${base}/api/auth/me`), 401, "not_logged_in"]
    ];
    for (const [response, status, code] of cases) {
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ ok: false, code });
    }

    const login = await post(`${base}/api/auth/login`, { login: "ANNA@example.com", password: anna.password });
    expect(login.status).toBe(200);
  });

  it("answers database_unavailable without a database", async () => {
    const base = await start(null);

    const response = await post(`${base}/api/auth/register`, anna);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, code: "database_unavailable" });
  });
});

describe("login cookie on the Socket.IO connection", () => {
  it("plays under the account name when the cookie is sent, and as a guest without it", async () => {
    const base = await start();
    const cookie = cookieOf(await post(`${base}/api/auth/register`, anna));

    const loggedIn = connect(base, { transports: ["websocket"], extraHeaders: { Cookie: cookie } });
    const guest = connect(base, { transports: ["websocket"] });
    try {
      const roomState = new Promise<RoomView>((resolve) => {
        guest.on("room:state", (view: RoomView) => {
          if (view.members.length === 2) resolve(view);
        });
      });
      const created = await new Promise<{ ok: boolean; data: SessionInfo }>((resolve) =>
        loggedIn.emit("room:create", { actionId: randomUUID(), displayName: "Typed name" }, resolve)
      );
      await new Promise((resolve) =>
        guest.emit("room:join", { actionId: randomUUID(), roomCode: created.data.roomCode, displayName: "Guest" }, resolve)
      );

      expect((await roomState).members.map((member) => member.displayName)).toEqual(["Anna", "Guest"]);
    } finally {
      loggedIn.close();
      guest.close();
    }
  });
});
