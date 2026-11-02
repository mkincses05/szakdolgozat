// Socket.IO event names, acknowledgements, and typed event maps.
// See docs/02-server-state-machine-and-socketio.md, section 2.

import type { GameEffect, SpyReveal, SwapResult } from "./effects.js";
import type { ErrorCode } from "./errors.js";
import type { MatchResults } from "./results.js";
import {
  gameDrawPayloadSchema,
  gamePlayPayloadSchema,
  roomCreatePayloadSchema,
  roomJoinPayloadSchema,
  roomLeavePayloadSchema,
  roomStartPayloadSchema,
  sessionResumePayloadSchema,
  type GameDrawPayload,
  type GamePlayPayload,
  type RoomCreatePayload,
  type RoomJoinPayload,
  type RoomLeavePayload,
  type RoomStartPayload,
  type SessionResumePayload
} from "./schemas.js";
import type { MatchView, RoomView } from "./views.js";

export const CLIENT_EVENTS = {
  roomCreate: "room:create",
  roomJoin: "room:join",
  roomLeave: "room:leave",
  roomStart: "room:start",
  gamePlay: "game:play",
  gameDraw: "game:draw",
  sessionResume: "session:resume"
} as const;

export const SERVER_EVENTS = {
  roomState: "room:state",
  gameState: "game:state",
  gameEffect: "game:effect",
  gameSpyReveal: "game:spyReveal",
  gameSwapResult: "game:swapResult",
  gameEnded: "game:ended"
} as const;

export const clientPayloadSchemas = {
  [CLIENT_EVENTS.roomCreate]: roomCreatePayloadSchema,
  [CLIENT_EVENTS.roomJoin]: roomJoinPayloadSchema,
  [CLIENT_EVENTS.roomLeave]: roomLeavePayloadSchema,
  [CLIENT_EVENTS.roomStart]: roomStartPayloadSchema,
  [CLIENT_EVENTS.gamePlay]: gamePlayPayloadSchema,
  [CLIENT_EVENTS.gameDraw]: gameDrawPayloadSchema,
  [CLIENT_EVENTS.sessionResume]: sessionResumePayloadSchema
} as const;

/** Acknowledgement of a client action: `{ ok: true }` or a stable error code. */
export type Ack<TData = undefined> =
  | (TData extends undefined ? { ok: true } : { ok: true; data: TData })
  | { ok: false; code: ErrorCode };

/** Returned when a player creates or joins a room, or resumes a session. */
export interface SessionInfo {
  userId: string;
  roomCode: string;
  reconnectToken: string;
}

type AckCallback<TData = undefined> = (ack: Ack<TData>) => void;

/** Typed client → server event map for `Server<ClientToServerEvents, ServerToClientEvents>`. */
export interface ClientToServerEvents {
  "room:create": (payload: RoomCreatePayload, ack: AckCallback<SessionInfo>) => void;
  "room:join": (payload: RoomJoinPayload, ack: AckCallback<SessionInfo>) => void;
  "room:leave": (payload: RoomLeavePayload, ack: AckCallback) => void;
  "room:start": (payload: RoomStartPayload, ack: AckCallback) => void;
  "game:play": (payload: GamePlayPayload, ack: AckCallback) => void;
  "game:draw": (payload: GameDrawPayload, ack: AckCallback) => void;
  "session:resume": (payload: SessionResumePayload, ack: AckCallback<SessionInfo>) => void;
}

/** Typed server → client event map. */
export interface ServerToClientEvents {
  "room:state": (room: RoomView) => void;
  "game:state": (view: MatchView) => void;
  "game:effect": (effect: GameEffect) => void;
  "game:spyReveal": (reveal: SpyReveal) => void;
  "game:swapResult": (result: SwapResult) => void;
  "game:ended": (results: MatchResults) => void;
}
