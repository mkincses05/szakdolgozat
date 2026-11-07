import { describe, expect, it } from "vitest";
import { AuthService, SESSION_LIFETIME_MS, SESSION_REFRESH_INTERVAL_MS } from "../../src/auth/auth-service.js";
import { MemoryAccountStore } from "./memory-account-store.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const anna = { username: "Anna_K", email: "Anna@Example.com", displayName: "Anna", password: "correct horse" };

function setup() {
  let time = 1_000_000;
  const store = new MemoryAccountStore();
  const auth = new AuthService(store, () => time);
  return { store, auth, advance: (ms: number) => (time += ms), now: () => time };
}

async function registered() {
  const context = setup();
  const result = await context.auth.register(anna);
  if (!result.ok) throw new Error(result.code);
  return { ...context, session: result.data };
}

describe("AuthService", () => {
  it("registers an account, stores only the password hash, and logs it in", async () => {
    const { store, session, now } = await registered();

    expect(session.profile).toMatchObject({ username: "Anna_K", displayName: "Anna", xp: 0, matchesPlayed: 0 });
    expect(session.expiresAt.getTime()).toBe(now() + SESSION_LIFETIME_MS);
    expect(store.accounts[0].passwordHash).toMatch(/^\$argon2id\$/);
    expect(store.accounts[0].passwordHash).not.toContain(anna.password);
    // Only the token's hash is stored.
    expect([...store.sessions.keys()]).not.toContain(session.token);
  });

  it("rejects a taken username or email regardless of case", async () => {
    const { auth } = await registered();

    expect(await auth.register({ ...anna, email: "other@example.com", username: "anna_k" })).toEqual({ ok: false, code: "username_taken" });
    expect(await auth.register({ ...anna, username: "other", email: "anna@example.COM" })).toEqual({ ok: false, code: "email_taken" });
  });

  it("logs in with the username or the email, and gives one answer for every wrong login", async () => {
    const { auth } = await registered();

    expect((await auth.login({ login: "anna_k", password: anna.password })).ok).toBe(true);
    expect((await auth.login({ login: "anna@example.com", password: anna.password })).ok).toBe(true);
    expect(await auth.login({ login: "anna_k", password: "wrong password" })).toEqual({ ok: false, code: "invalid_credentials" });
    expect(await auth.login({ login: "nobody", password: anna.password })).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("finds the account of a token until it expires or is logged out", async () => {
    const { auth, session, advance } = await registered();

    expect(await auth.authenticate(session.token, { renew: true })).toEqual({ id: session.profile.id, displayName: "Anna", renewedUntil: null });
    expect(await auth.authenticate("unknown-token", { renew: true })).toBeNull();
    expect(await auth.authenticate(undefined, { renew: true })).toBeNull();

    await auth.logout(session.token);
    expect(await auth.authenticate(session.token, { renew: true })).toBeNull();

    const login = await auth.login({ login: "anna_k", password: anna.password });
    if (!login.ok) throw new Error(login.code);
    advance(SESSION_LIFETIME_MS - 1);
    expect(await auth.authenticate(login.data.token, { renew: true })).not.toBeNull();
    advance(SESSION_LIFETIME_MS);
    expect(await auth.authenticate(login.data.token, { renew: true })).toBeNull();
  });

  it("moves the expiry when a session is used after a day, so active players stay logged in", async () => {
    const { auth, session, advance, now } = await registered();

    advance(SESSION_REFRESH_INTERVAL_MS - 1);
    expect((await auth.authenticate(session.token, { renew: true }))?.renewedUntil).toBeNull();

    advance(1);
    expect((await auth.authenticate(session.token, { renew: true }))?.renewedUntil).toEqual(new Date(now() + SESSION_LIFETIME_MS));

    // Daily use for 40 days outlives the original 30-day expiry...
    for (let day = 0; day < 40; day++) {
      advance(DAY_MS);
      expect(await auth.authenticate(session.token, { renew: true })).not.toBeNull();
    }
    // ...and 30 days without use end the session.
    advance(SESSION_LIFETIME_MS);
    expect(await auth.authenticate(session.token, { renew: true })).toBeNull();
  });

  it("does not move the expiry for a Socket.IO handshake, which cannot renew the cookie", async () => {
    const { auth, store, session, advance } = await registered();

    advance(SESSION_REFRESH_INTERVAL_MS);
    expect((await auth.authenticate(session.token, { renew: false }))?.renewedUntil).toBeNull();
    expect([...store.sessions.values()][0].expiresAt).toEqual(session.expiresAt);

    // The next HTTP request still sees an old session and renews the cookie together with it.
    expect((await auth.authenticate(session.token, { renew: true }))?.renewedUntil).not.toBeNull();
  });

  it("answers database_unavailable without a store and treats every connection as a guest", async () => {
    const auth = new AuthService(null, () => 0);

    expect(await auth.register(anna)).toEqual({ ok: false, code: "database_unavailable" });
    expect(await auth.login({ login: "anna_k", password: "x" })).toEqual({ ok: false, code: "database_unavailable" });
    expect(await auth.profile("token")).toEqual({ ok: false, code: "database_unavailable" });
    expect(await auth.authenticate("token", { renew: true })).toBeNull();
  });
});
