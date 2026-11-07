// Registration, login, logout, and the lookup of the account behind a login token (docs/03
// section 2). Without a database every account operation answers `database_unavailable`; playing as
// a guest keeps working.

import type { AccountProfile, ErrorCode, LoginPayload, RegisterPayload } from "@wildhand/shared";
import type { AccountStore } from "./account-store.js";
import { hashLoginToken, hashPassword, newLoginToken, verifyAgainstDummy, verifyPassword } from "./credentials.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A session expires after 30 days without use. */
export const SESSION_LIFETIME_MS = 30 * DAY_MS;
/** Using a session moves its expiry, at most once a day, so not every request writes to the database. */
export const SESSION_REFRESH_INTERVAL_MS = DAY_MS;

export type AuthResult<T> = { ok: true; data: T } | { ok: false; code: ErrorCode };

export interface LoginSession {
  profile: AccountProfile;
  token: string;
  expiresAt: Date;
}

/** The account a socket or request belongs to. */
export interface AuthenticatedAccount {
  id: string;
  displayName: string;
  /** Set when the expiry moved, so an HTTP response can renew the cookie. */
  renewedUntil: Date | null;
}

export class AuthService {
  constructor(
    private readonly store: AccountStore | null,
    private readonly now: () => number
  ) {}

  async register(payload: RegisterPayload): Promise<AuthResult<LoginSession>> {
    if (!this.store) {
      return { ok: false, code: "database_unavailable" };
    }

    const created = await this.store.createAccount({
      username: payload.username,
      email: payload.email,
      displayName: payload.displayName,
      passwordHash: await hashPassword(payload.password)
    });
    if (typeof created === "string") {
      return { ok: false, code: created };
    }

    return { ok: true, data: await this.startSession(created) };
  }

  async login(payload: LoginPayload): Promise<AuthResult<LoginSession>> {
    if (!this.store) {
      return { ok: false, code: "database_unavailable" };
    }

    const found = await this.store.findByLogin(payload.login);
    // The same answer, and about the same time, whether the account or only the password is wrong.
    const valid = found
      ? await verifyPassword(found.passwordHash, payload.password)
      : await verifyAgainstDummy(payload.password);
    if (!found || !valid) {
      return { ok: false, code: "invalid_credentials" };
    }

    await this.store.deleteExpiredSessions(found.profile.id, new Date(this.now()));
    return { ok: true, data: await this.startSession(found.profile) };
  }

  async logout(token: string | undefined): Promise<void> {
    if (this.store && token) {
      await this.store.deleteSession(hashLoginToken(token));
    }
  }

  /** The account behind a login token, or `null` for a guest, an unknown, or an expired token. */
  async authenticate(token: string | undefined): Promise<AuthenticatedAccount | null> {
    if (!this.store || !token) {
      return null;
    }

    const tokenHash = hashLoginToken(token);
    const now = new Date(this.now());
    const session = await this.store.findSession(tokenHash, now);
    if (!session) {
      return null;
    }

    let renewedUntil: Date | null = null;
    if (now.getTime() - session.lastUsedAt.getTime() >= SESSION_REFRESH_INTERVAL_MS) {
      renewedUntil = new Date(now.getTime() + SESSION_LIFETIME_MS);
      await this.store.extendSession(tokenHash, now, renewedUntil);
    }

    return { id: session.userId, displayName: session.displayName, renewedUntil };
  }

  async profile(token: string | undefined): Promise<AuthResult<{ profile: AccountProfile; renewedUntil: Date | null }>> {
    if (!this.store) {
      return { ok: false, code: "database_unavailable" };
    }

    const account = await this.authenticate(token);
    const profile = account && (await this.store.getProfile(account.id));
    if (!account || !profile) {
      return { ok: false, code: "not_logged_in" };
    }
    return { ok: true, data: { profile, renewedUntil: account.renewedUntil } };
  }

  private async startSession(profile: AccountProfile): Promise<LoginSession> {
    const token = newLoginToken();
    const expiresAt = new Date(this.now() + SESSION_LIFETIME_MS);
    await this.store!.createSession(profile.id, hashLoginToken(token), expiresAt);
    return { profile, token, expiresAt };
  }
}
