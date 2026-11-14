// An in-memory AccountStore for tests without a database. Usernames and emails are unique
// case-insensitively, like the indexes in PostgreSQL.

import type { AccountProfile } from "@wildhand/shared";
import type { AccountStore, StoredSession } from "../../src/auth/account-store.js";
import { SESSION_LIFETIME_MS } from "../../src/auth/auth-service.js";

export class MemoryAccountStore implements AccountStore {
  readonly accounts: (AccountProfile & { passwordHash: string })[] = [];
  readonly sessions = new Map<string, { userId: string; lastUsedAt: Date; expiresAt: Date }>();
  private nextId = 0;

  async createAccount(account: { username: string; email: string; displayName: string; passwordHash: string }) {
    const lower = (value: string) => value.toLowerCase();
    if (this.accounts.some((existing) => lower(existing.username) === lower(account.username))) return "username_taken" as const;
    if (this.accounts.some((existing) => lower(existing.email) === lower(account.email))) return "email_taken" as const;

    const stored = { id: `account-${++this.nextId}`, xp: 0, matchesPlayed: 0, wins: 0, forfeits: 0, ...account };
    this.accounts.push(stored);
    return this.profileOf(stored);
  }

  async findByLogin(login: string) {
    const column = login.includes("@") ? "email" : "username";
    const found = this.accounts.find((account) => account[column].toLowerCase() === login.toLowerCase());
    return found ? { profile: this.profileOf(found), passwordHash: found.passwordHash } : null;
  }

  async getProfile(userId: string) {
    const found = this.accounts.find((account) => account.id === userId);
    return found ? this.profileOf(found) : null;
  }

  async createSession(userId: string, tokenHash: Buffer, expiresAt: Date) {
    // A new session counts as used when it is created, like the column default in PostgreSQL.
    const createdAt = new Date(expiresAt.getTime() - SESSION_LIFETIME_MS);
    this.sessions.set(tokenHash.toString("hex"), { userId, lastUsedAt: createdAt, expiresAt });
  }

  async findSession(tokenHash: Buffer, now: Date): Promise<StoredSession | null> {
    const session = this.sessions.get(tokenHash.toString("hex"));
    const account = session && this.accounts.find((candidate) => candidate.id === session.userId);
    if (!session || !account || session.expiresAt <= now) return null;
    return { userId: session.userId, displayName: account.displayName, lastUsedAt: session.lastUsedAt, expiresAt: session.expiresAt };
  }

  async extendSession(tokenHash: Buffer, now: Date, expiresAt: Date) {
    const session = this.sessions.get(tokenHash.toString("hex"));
    if (session) Object.assign(session, { lastUsedAt: now, expiresAt });
  }

  async deleteSession(tokenHash: Buffer) {
    this.sessions.delete(tokenHash.toString("hex"));
  }

  async deleteExpiredSessions(userId: string, now: Date) {
    for (const [key, session] of this.sessions) {
      if (session.userId === userId && session.expiresAt <= now) this.sessions.delete(key);
    }
  }

  private profileOf({ passwordHash: _passwordHash, ...profile }: AccountProfile & { passwordHash: string }): AccountProfile {
    return profile;
  }
}
