// Database access for accounts and login sessions (docs/03 section 2). Every query runs with the
// restricted backend role.

import type { AccountProfile } from "@wildhand/shared";
import { DatabaseError, type Pool } from "pg";

export interface NewAccount {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface StoredSession {
  userId: string;
  displayName: string;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface AccountStore {
  createAccount(account: NewAccount): Promise<AccountProfile | "username_taken" | "email_taken">;
  /** Finds an account by username or, if `login` contains `@`, by email; both case-insensitively. */
  findByLogin(login: string): Promise<{ profile: AccountProfile; passwordHash: string } | null>;
  getProfile(userId: string): Promise<AccountProfile | null>;
  createSession(userId: string, tokenHash: Buffer, expiresAt: Date): Promise<void>;
  /** Returns the session only while it has not expired. */
  findSession(tokenHash: Buffer, now: Date): Promise<StoredSession | null>;
  extendSession(tokenHash: Buffer, now: Date, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: Buffer): Promise<void>;
  deleteExpiredSessions(userId: string, now: Date): Promise<void>;
}

interface ProfileRow {
  id: string;
  username: string;
  email: string;
  display_name: string;
  xp: string;
  matches_played: number;
  wins: number;
  forfeits: number;
}

const PROFILE_COLUMNS = "u.id, u.username, u.email, u.display_name, u.xp, u.matches_played, u.wins, u.forfeits";

function toProfile(row: ProfileRow): AccountProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    // bigint arrives as a string; XP stays far below Number.MAX_SAFE_INTEGER.
    xp: Number(row.xp),
    matchesPlayed: row.matches_played,
    wins: row.wins,
    forfeits: row.forfeits
  };
}

export function createPgAccountStore(pool: Pool): AccountStore {
  return {
    async createAccount(account) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query<ProfileRow>(
          `INSERT INTO users AS u (username, email, display_name) VALUES ($1, $2, $3) RETURNING ${PROFILE_COLUMNS}`,
          [account.username, account.email, account.displayName]
        );
        await client.query("INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)", [
          rows[0].id,
          account.passwordHash
        ]);
        await client.query("COMMIT");
        return toProfile(rows[0]);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        // 23505: unique_violation on one of the case-insensitive unique indexes
        if (error instanceof DatabaseError && error.code === "23505") {
          if (error.constraint === "users_username_key") return "username_taken";
          if (error.constraint === "users_email_key") return "email_taken";
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async findByLogin(login) {
      const column = login.includes("@") ? "email" : "username";
      const { rows } = await pool.query<ProfileRow & { password_hash: string }>(
        `SELECT ${PROFILE_COLUMNS}, c.password_hash
         FROM users u JOIN user_credentials c ON c.user_id = u.id
         WHERE lower(u.${column}) = lower($1)`,
        [login]
      );
      return rows[0] ? { profile: toProfile(rows[0]), passwordHash: rows[0].password_hash } : null;
    },

    async getProfile(userId) {
      const { rows } = await pool.query<ProfileRow>(`SELECT ${PROFILE_COLUMNS} FROM users u WHERE u.id = $1`, [userId]);
      return rows[0] ? toProfile(rows[0]) : null;
    },

    async createSession(userId, tokenHash, expiresAt) {
      await pool.query("INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
        userId,
        tokenHash,
        expiresAt
      ]);
    },

    async findSession(tokenHash, now) {
      const { rows } = await pool.query<{
        user_id: string;
        display_name: string;
        last_used_at: Date;
        expires_at: Date;
      }>(
        `SELECT s.user_id, u.display_name, s.last_used_at, s.expires_at
         FROM auth_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > $2`,
        [tokenHash, now]
      );
      const row = rows[0];
      return row
        ? { userId: row.user_id, displayName: row.display_name, lastUsedAt: row.last_used_at, expiresAt: row.expires_at }
        : null;
    },

    async extendSession(tokenHash, now, expiresAt) {
      await pool.query("UPDATE auth_sessions SET last_used_at = $2, expires_at = $3 WHERE token_hash = $1", [
        tokenHash,
        now,
        expiresAt
      ]);
    },

    async deleteSession(tokenHash) {
      await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]);
    },

    async deleteExpiredSessions(userId, now) {
      await pool.query("DELETE FROM auth_sessions WHERE user_id = $1 AND expires_at <= $2", [userId, now]);
    }
  };
}
