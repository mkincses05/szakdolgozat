// Rooms, sessions, and match lifecycle (docs/02). All methods are synchronous, so the actions of a
// match are processed one at a time and cannot interleave. Every client action is answered with an
// acknowledgement; outgoing state goes through the Transport, addressed to single users.

import { randomInt, randomUUID } from "node:crypto";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROOM_CODE_LENGTH,
  type Ack,
  type ErrorCode,
  type GameDrawPayload,
  type GamePlayPayload,
  type RoomState,
  type RoomView,
  type SessionInfo
} from "@wildhand/shared";
import type { Logger } from "../logger.js";
import type { Scheduler } from "../scheduler.js";
import { MatchController } from "./match-controller.js";
import { SessionRegistry, rememberAction, type IdSource, type Session, type StoredAck } from "./sessions.js";
import type { Transport } from "./transport.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export interface RandomSource extends IdSource {
  roomCode(): string;
  matchId(): string;
  seed(): number;
}

export const cryptoRandomSource: RandomSource = {
  userId: () => randomUUID(),
  reconnectToken: () => randomUUID(),
  matchId: () => randomUUID(),
  roomCode: () =>
    Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join(""),
  seed: () => randomInt(2 ** 32)
};

export interface RoomServiceOptions {
  transport: Transport;
  scheduler: Scheduler;
  logger: Logger;
  random?: RandomSource;
  turnTimeoutMs: number;
  reconnectGraceMs: number;
}

/** Called before any message is sent, so the caller can route messages for the new user. */
export type BindSession = (userId: string) => void;

interface Room {
  code: string;
  state: RoomState;
  hostUserId: string;
  /** In join order, for host transfer (R24). */
  members: string[];
  /** The running match, or the last ended one until the next start. */
  match: MatchController | null;
}

export class RoomService {
  private readonly rooms = new Map<string, Room>();
  private readonly sessions: SessionRegistry;
  private readonly random: RandomSource;

  constructor(private readonly options: RoomServiceOptions) {
    this.random = options.random ?? cryptoRandomSource;
    this.sessions = new SessionRegistry(this.random);
  }

  createRoom(currentUserId: string | null, displayName: string, bind: BindSession): Ack<SessionInfo> {
    if (currentUserId !== null && this.sessions.get(currentUserId)) {
      return { ok: false, code: "already_in_room" };
    }

    let code = this.random.roomCode();
    while (this.rooms.has(code)) {
      code = this.random.roomCode();
    }

    const session = this.sessions.create(displayName, code);
    const room: Room = { code, state: "lobby", hostUserId: session.userId, members: [session.userId], match: null };
    this.rooms.set(code, room);

    bind(session.userId);
    this.broadcastRoom(room);
    return { ok: true, data: sessionInfo(session) };
  }

  joinRoom(currentUserId: string | null, roomCode: string, displayName: string, bind: BindSession): Ack<SessionInfo> {
    if (currentUserId !== null && this.sessions.get(currentUserId)) {
      return { ok: false, code: "already_in_room" };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, code: "room_not_found" };
    }
    if (room.state === "in_match") {
      return { ok: false, code: "room_in_match" };
    }
    // R1
    if (room.members.length >= MAX_PLAYERS) {
      return { ok: false, code: "room_full" };
    }

    const session = this.sessions.create(displayName, room.code);
    room.members.push(session.userId);

    bind(session.userId);
    this.broadcastRoom(room);
    return { ok: true, data: sessionInfo(session) };
  }

  leaveRoom(userId: string, actionId: string): Ack {
    return this.withAction(userId, actionId, (session, room) => {
      this.removeMember(room, session, false);
      return { ok: true };
    });
  }

  startMatch(userId: string, actionId: string): Ack {
    return this.withAction(userId, actionId, (session, room) => {
      if (room.state !== "lobby") {
        return { ok: false, code: "room_in_match" };
      }
      // R24
      if (room.hostUserId !== session.userId) {
        return { ok: false, code: "not_host" };
      }
      // R1
      if (room.members.length < MIN_PLAYERS) {
        return { ok: false, code: "not_enough_players" };
      }

      room.match?.dispose();
      room.state = "in_match";
      this.broadcastRoom(room);

      const started = MatchController.start({
        matchId: this.random.matchId(),
        seed: this.random.seed(),
        players: room.members.map((memberId) => {
          const member = this.sessions.get(memberId)!;
          return { userId: member.userId, displayName: member.displayName, connected: member.connected };
        }),
        transport: this.options.transport,
        scheduler: this.options.scheduler,
        logger: this.options.logger,
        turnTimeoutMs: this.options.turnTimeoutMs,
        recipients: () => room.members,
        onEnded: () => this.endMatch(room)
      });

      if (!started.ok) {
        room.state = "lobby";
        this.broadcastRoom(room);
        return started;
      }

      room.match = started.match;
      this.options.logger.info(`Match started in room ${room.code} with seed ${started.match.seed}`);
      return { ok: true };
    });
  }

  play(userId: string, payload: GamePlayPayload): Ack {
    const { actionId, stateVersion, ...action } = payload;
    return this.withMatchAction(userId, actionId, stateVersion, (match) => match.play(userId, action));
  }

  draw(userId: string, payload: GameDrawPayload): Ack {
    return this.withMatchAction(userId, payload.actionId, payload.stateVersion, (match) => match.draw(userId));
  }

  /** Reconnects a session within the grace period (R23) and resends the current state. */
  resume(currentUserId: string | null, token: string, bind: BindSession): Ack<SessionInfo> {
    const session = this.sessions.findByToken(token);
    if (session === "expired") {
      return { ok: false, code: "session_expired" };
    }
    if (!session) {
      return { ok: false, code: "invalid_reconnect_token" };
    }
    // A connection carries one session. Resuming the same session again (a retry after a lost
    // acknowledgement) is allowed; taking over another one would leave the first one bound here.
    if (currentUserId !== null && currentUserId !== session.userId && this.sessions.get(currentUserId)) {
      return { ok: false, code: "already_in_room" };
    }

    const room = this.rooms.get(session.roomCode)!;
    bind(session.userId);

    if (!session.connected) {
      session.connected = true;
      this.clearGraceTimer(session);
      if (room.state === "in_match") {
        room.match?.setPresence(session.userId, "connected");
      }
    }

    this.broadcastRoom(room);
    if (room.match?.includes(session.userId)) {
      room.match.sendSnapshot(session.userId);
    }

    return { ok: true, data: sessionInfo(session) };
  }

  /** The user's connection was lost: their grace period starts (R23). */
  disconnect(userId: string): void {
    const session = this.sessions.get(userId);
    const room = session && this.rooms.get(session.roomCode);
    if (!session || !room || !session.connected) {
      return;
    }

    session.connected = false;
    session.graceTimer = this.options.scheduler.setTimeout(() => {
      session.graceTimer = null;
      this.removeMember(room, session, true);
    }, this.options.reconnectGraceMs);

    if (room.state === "in_match") {
      room.match?.setPresence(userId, "disconnected");
    }
    this.broadcastRoom(room);
  }

  dispose(): void {
    for (const session of this.sessions.all()) {
      this.clearGraceTimer(session);
    }
    for (const room of this.rooms.values()) {
      room.match?.dispose();
    }
    this.rooms.clear();
  }

  /** Leaving or a grace-period expiry: a forfeit for active players in a running match (R23). */
  private removeMember(room: Room, session: Session, expired: boolean): void {
    const { userId } = session;
    this.clearGraceTimer(session);
    this.sessions.remove(session, expired);
    room.members = room.members.filter((memberId) => memberId !== userId);

    if (room.members.length === 0) {
      room.state = "closed";
      room.match?.dispose();
      this.rooms.delete(room.code);
      return;
    }

    // R24: the longest-present member becomes the host.
    if (room.hostUserId === userId) {
      room.hostUserId = room.members[0];
    }

    const match = room.match;
    if (room.state === "in_match" && match?.includes(userId)) {
      if (match.isActivePlayer(userId)) {
        match.forfeit(userId);
      }
      if (!match.ended) {
        match.setPresence(userId, "left");
      }
    }

    this.broadcastRoom(room);
  }

  private endMatch(room: Room): void {
    room.state = "lobby";
    this.broadcastRoom(room);
  }

  private withMatchAction(
    userId: string,
    actionId: string,
    stateVersion: number,
    run: (match: MatchController) => ErrorCode | null
  ): Ack {
    return this.withAction(userId, actionId, (_session, room) => {
      const match = room.match;
      if (room.state !== "in_match" || !match) {
        return { ok: false, code: "match_not_running" };
      }
      if (stateVersion !== match.stateVersion) {
        return { ok: false, code: "stale_state" };
      }

      const code = run(match);
      return code === null ? { ok: true } : { ok: false, code };
    });
  }

  /** Answers duplicate actions with the original acknowledgement (docs/02, section 2). */
  private withAction<TAck extends StoredAck>(
    userId: string,
    actionId: string,
    run: (session: Session, room: Room) => TAck
  ): TAck {
    const session = this.sessions.get(userId);
    if (!session) {
      return { ok: false, code: "not_in_room" } as TAck;
    }

    const previous = session.processedActions.get(actionId);
    if (previous) {
      return previous as TAck;
    }

    const ack = run(session, this.rooms.get(session.roomCode)!);
    rememberAction(session, actionId, ack);

    if (!ack.ok) {
      this.options.logger.warn(`Rejected action ${actionId} of ${userId}: ${ack.code}`);
    }
    return ack;
  }

  private clearGraceTimer(session: Session): void {
    if (session.graceTimer !== null) {
      this.options.scheduler.clearTimeout(session.graceTimer);
      session.graceTimer = null;
    }
  }

  private broadcastRoom(room: Room): void {
    const view: RoomView = {
      code: room.code,
      state: room.state,
      hostUserId: room.hostUserId,
      members: room.members.map((memberId) => {
        const member = this.sessions.get(memberId)!;
        return {
          userId: member.userId,
          displayName: member.displayName,
          presence: member.connected ? "connected" : "disconnected"
        };
      }),
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS
    };

    for (const memberId of room.members) {
      this.options.transport.send(memberId, "room:state", view);
    }
  }
}

function sessionInfo(session: Session): SessionInfo {
  return { userId: session.userId, roomCode: session.roomCode, reconnectToken: session.reconnectToken };
}
