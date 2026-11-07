// Typed client actions with acknowledgements (docs/02, section 2). Every action gets a fresh
// `actionId`; the server answers with `{ ok: true }` or a stable error code that the UI translates.

import type { ClientToServerEvents, ErrorCode } from "@wildhand/shared";
import { socket } from "./socket";

const ACK_TIMEOUT_MS = 10_000;

/** Errors detected by the client itself, translated under `common:errors` like the server codes. */
export type ClientErrorCode = "not_connected" | "no_response";
export type ActionErrorCode = ErrorCode | ClientErrorCode;

type ClientEvent = keyof ClientToServerEvents;
type Payload<E extends ClientEvent> = Parameters<ClientToServerEvents[E]>[0];
type ServerAck<E extends ClientEvent> = Parameters<Parameters<ClientToServerEvents[E]>[1]>[0];

export type ActionResult<E extends ClientEvent> = ServerAck<E> | { ok: false; code: ClientErrorCode };

/** Events that carry an `actionId`; everything except `session:resume`. */
export type ActionEvent = Exclude<ClientEvent, "session:resume">;
export type ActionPayload<E extends ActionEvent> = Omit<Payload<E>, "actionId">;

interface AckEmitter {
  emitWithAck(event: string, payload: unknown): Promise<unknown>;
}

async function request<E extends ClientEvent>(event: E, payload: Payload<E>): Promise<ActionResult<E>> {
  // Socket.IO would buffer the event and send it on reconnect, before the session is resumed.
  if (!socket.connected) {
    return { ok: false, code: "not_connected" };
  }

  try {
    const emitter = socket.timeout(ACK_TIMEOUT_MS) as unknown as AckEmitter;
    return (await emitter.emitWithAck(event, payload)) as ServerAck<E>;
  } catch {
    return { ok: false, code: "no_response" };
  }
}

export function sendAction<E extends ActionEvent>(event: E, payload: ActionPayload<E>): Promise<ActionResult<E>> {
  return request(event, { ...payload, actionId: crypto.randomUUID() } as Payload<E>);
}

export function resumeSession(reconnectToken: string): Promise<ActionResult<"session:resume">> {
  return request("session:resume", { reconnectToken });
}
