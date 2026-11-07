// Socket.IO transport: validates payloads with the shared zod schemas, routes actions to the room
// service, and delivers outgoing messages to the socket of each user. Game rules stay in the engine.

import type { Server, Socket } from "socket.io";
import {
  clientPayloadSchemas,
  type Ack,
  type ClientToServerEvents,
  type ServerToClientEvents
} from "@wildhand/shared";
import type { RoomService } from "../game/room-service.js";
import type { Transport } from "../game/transport.js";
import type { Logger } from "../logger.js";

export interface SocketData {
  /** The session bound to this socket, `null` before create, join, or resume. */
  userId: string | null;
}

export type WildhandServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type WildhandSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Routes messages to the one socket currently bound to each user. */
export class SocketTransport implements Transport {
  private readonly sockets = new Map<string, WildhandSocket>();

  send<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    this.sockets.get(userId)?.emit(event, ...args);
  }

  /** Binds the socket to the user and returns the socket it replaces, if any. */
  bind(userId: string, socket: WildhandSocket): WildhandSocket | undefined {
    const previous = this.sockets.get(userId);
    this.sockets.set(userId, socket);
    return previous === socket ? undefined : previous;
  }

  /** Unbinds the user only if this socket is still the bound one. */
  unbind(userId: string, socket: WildhandSocket): boolean {
    if (this.sockets.get(userId) !== socket) {
      return false;
    }
    this.sockets.delete(userId);
    return true;
  }
}

type ClientEvent = keyof typeof clientPayloadSchemas;
type Payload<E extends ClientEvent> = Parameters<ClientToServerEvents[E]>[0];
type AckOf<E extends ClientEvent> = Parameters<Parameters<ClientToServerEvents[E]>[1]>[0];

export function registerHandlers(
  io: WildhandServer,
  roomService: RoomService,
  transport: SocketTransport,
  logger: Logger
): void {
  io.on("connection", (socket) => {
    socket.data.userId = null;

    /** Duplicate detection for actions sent before the socket has a session. */
    const preSessionAcks = new Map<string, Ack<unknown>>();

    const bind = (userId: string) => {
      const previous = transport.bind(userId, socket);
      socket.data.userId = userId;
      if (previous) {
        previous.data.userId = null;
        previous.disconnect(true);
      }
    };

    function on<E extends ClientEvent>(event: E, handler: (payload: Payload<E>) => AckOf<E>): void {
      const listener = (payload: unknown, ack: unknown) => {
        if (typeof ack !== "function") {
          return;
        }

        const parsed = clientPayloadSchemas[event].safeParse(payload);
        if (!parsed.success) {
          ack({ ok: false, code: "invalid_payload" });
          return;
        }

        try {
          ack(handler(parsed.data as Payload<E>));
        } catch (error) {
          logger.error(`Unexpected error while handling ${event}`, error);
          ack({ ok: false, code: "internal_error" });
        }
      };

      (socket.on as (event: string, listener: (...args: unknown[]) => void) => void)(event, listener);
    }

    function withSession<E extends ClientEvent>(run: (userId: string) => AckOf<E>): AckOf<E> {
      const userId = socket.data.userId;
      return userId === null ? ({ ok: false, code: "not_in_room" } as AckOf<E>) : run(userId);
    }

    function once<T extends Ack<unknown>>(actionId: string, run: () => T): T {
      const previous = preSessionAcks.get(actionId);
      if (previous) {
        return previous as T;
      }
      const ack = run();
      preSessionAcks.set(actionId, ack);
      return ack;
    }

    on("room:create", (payload) =>
      once(payload.actionId, () => roomService.createRoom(socket.data.userId, payload.displayName, bind))
    );

    on("room:join", (payload) =>
      once(payload.actionId, () =>
        roomService.joinRoom(socket.data.userId, payload.roomCode, payload.displayName, bind)
      )
    );

    on("room:leave", (payload) =>
      withSession((userId) => {
        const ack = roomService.leaveRoom(userId, payload.actionId);
        if (ack.ok && transport.unbind(userId, socket)) {
          socket.data.userId = null;
        }
        return ack;
      })
    );

    on("room:start", (payload) => withSession((userId) => roomService.startMatch(userId, payload.actionId)));
    on("game:play", (payload) => withSession((userId) => roomService.play(userId, payload)));
    on("game:draw", (payload) => withSession((userId) => roomService.draw(userId, payload)));
    on("session:resume", (payload) => roomService.resume(socket.data.userId, payload.reconnectToken, bind));

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (userId !== null && transport.unbind(userId, socket)) {
        roomService.disconnect(userId);
      }
    });
  });
}
