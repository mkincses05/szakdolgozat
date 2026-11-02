// Player sessions: one session per user, bound to one room. The reconnect token resumes a session
// within the grace period (R23).

import type { Ack, SessionInfo } from "@wildhand/shared";
import type { TimerHandle } from "../scheduler.js";

/** Remembered acknowledgements per session, so duplicate actions get the original answer. */
const PROCESSED_ACTIONS_LIMIT = 100;
const EXPIRED_TOKENS_LIMIT = 1000;

export type StoredAck = Ack | Ack<SessionInfo>;

export interface Session {
  userId: string;
  reconnectToken: string;
  displayName: string;
  roomCode: string;
  connected: boolean;
  graceTimer: TimerHandle | null;
  processedActions: Map<string, StoredAck>;
}

export interface IdSource {
  userId(): string;
  reconnectToken(): string;
}

export class SessionRegistry {
  private readonly byUserId = new Map<string, Session>();
  private readonly byToken = new Map<string, Session>();
  private readonly expiredTokens = new Set<string>();

  constructor(private readonly ids: IdSource) {}

  create(displayName: string, roomCode: string): Session {
    const session: Session = {
      userId: this.ids.userId(),
      reconnectToken: this.ids.reconnectToken(),
      displayName,
      roomCode,
      connected: true,
      graceTimer: null,
      processedActions: new Map()
    };

    this.byUserId.set(session.userId, session);
    this.byToken.set(session.reconnectToken, session);
    return session;
  }

  get(userId: string): Session | undefined {
    return this.byUserId.get(userId);
  }

  /** `"expired"` when the session was removed because its grace period ran out. */
  findByToken(token: string): Session | "expired" | undefined {
    return this.byToken.get(token) ?? (this.expiredTokens.has(token) ? "expired" : undefined);
  }

  remove(session: Session, expired: boolean): void {
    this.byUserId.delete(session.userId);
    this.byToken.delete(session.reconnectToken);

    if (expired) {
      this.expiredTokens.add(session.reconnectToken);
      if (this.expiredTokens.size > EXPIRED_TOKENS_LIMIT) {
        this.expiredTokens.delete(this.expiredTokens.values().next().value!);
      }
    }
  }

  all(): Session[] {
    return [...this.byUserId.values()];
  }
}

export function rememberAction(session: Session, actionId: string, ack: StoredAck): void {
  session.processedActions.set(actionId, ack);
  if (session.processedActions.size > PROCESSED_ACTIONS_LIMIT) {
    session.processedActions.delete(session.processedActions.keys().next().value!);
  }
}
