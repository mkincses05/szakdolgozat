import type { Ack, ServerToClientEvents, SessionInfo } from "@wildhand/shared";
import { expect } from "vitest";
import { RoomService, type RandomSource, type RoomServiceOptions } from "../../src/game/room-service.js";
import type { Transport } from "../../src/game/transport.js";
import type { Logger } from "../../src/logger.js";
import type { Scheduler, TimerHandle } from "../../src/scheduler.js";

export const TURN_TIMEOUT_MS = 1_000;
export const RECONNECT_GRACE_MS = 5_000;

/** Timers run only when the test advances the clock. */
export class FakeScheduler implements Scheduler {
  private time = 0;
  private nextId = 0;
  private readonly timers = new Map<number, { at: number; callback: () => void }>();

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, delayMs: number): TimerHandle {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + delayMs, callback });
    return id as unknown as TimerHandle;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers.delete(handle as unknown as number);
  }

  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;

      this.timers.delete(due[0]);
      this.time = due[1].at;
      due[1].callback();
    }
    this.time = target;
  }

  get pending(): number {
    return this.timers.size;
  }
}

type EventName = keyof ServerToClientEvents;
type EventPayload<E extends EventName> = Parameters<ServerToClientEvents[E]>[0];

export interface Message {
  userId: string;
  event: EventName;
  payload: unknown;
}

export class RecordingTransport implements Transport {
  messages: Message[] = [];

  send<E extends EventName>(userId: string, event: E, ...args: Parameters<ServerToClientEvents[E]>): void {
    this.messages.push({ userId, event, payload: structuredClone(args[0]) });
  }

  to<E extends EventName>(userId: string, event: E): EventPayload<E>[] {
    return this.messages
      .filter((message) => message.userId === userId && message.event === event)
      .map((message) => message.payload as EventPayload<E>);
  }

  last<E extends EventName>(userId: string, event: E): EventPayload<E> {
    const payloads = this.to(userId, event);
    expect(payloads.length, `no ${event} sent to ${userId}`).toBeGreaterThan(0);
    return payloads[payloads.length - 1];
  }

  clear(): void {
    this.messages = [];
  }
}

export const silentLogger: Logger = { info: () => {}, warn: () => {}, error: () => {} };

/** Predictable IDs: users `u1`, `u2`, ...; rooms `ROOM01`, ...; a configurable match seed. */
export function sequentialRandom(seed = 1): RandomSource & { seedValue: number } {
  let users = 0;
  let rooms = 0;
  let matches = 0;
  return {
    seedValue: seed,
    userId: () => `u${++users}`,
    reconnectToken: () => `token-${users}`,
    roomCode: () => `ROOM${String(++rooms).padStart(2, "0")}`,
    matchId: () => `match-${++matches}`,
    seed() {
      return this.seedValue;
    }
  };
}

let actionCounter = 0;
export const nextActionId = () => `action-${++actionCounter}`;

export function expectOkAck<T>(ack: Ack<T>): T {
  if (!ack.ok) {
    expect.fail(`expected ok, got ${ack.code}`);
  }
  return (ack as { data?: T }).data as T;
}

export function setup(seed = 1, overrides: Partial<RoomServiceOptions> = {}) {
  const transport = new RecordingTransport();
  const scheduler = new FakeScheduler();
  const random = sequentialRandom(seed);
  const service = new RoomService({
    transport,
    scheduler,
    logger: silentLogger,
    random,
    turnTimeoutMs: TURN_TIMEOUT_MS,
    reconnectGraceMs: RECONNECT_GRACE_MS,
    ...overrides
  });
  const noBind = () => {};

  return {
    service,
    transport,
    scheduler,
    random,
    create: (name = "Host"): SessionInfo => expectOkAck(service.createRoom(null, name, noBind)),
    join: (roomCode: string, name: string): SessionInfo => expectOkAck(service.joinRoom(null, roomCode, name, noBind)),
    start: (userId: string) => service.startMatch(userId, nextActionId()),
    resume: (token: string) => service.resume(null, token, noBind),
    /** Draws for the current player of the latest view sent to `observer`. */
    drawFor: (userId: string) => {
      const view = transport.last(userId, "game:state");
      return service.draw(userId, { actionId: nextActionId(), stateVersion: view.stateVersion });
    }
  };
}

/** Creates a room with `count` members and starts the match. */
export function startedRoom(count: number, seed = 1, overrides: Partial<RoomServiceOptions> = {}) {
  const context = setup(seed, overrides);
  const host = context.create("Player 1");
  const members = [host];
  for (let index = 2; index <= count; index++) {
    members.push(context.join(host.roomCode, `Player ${index}`));
  }
  expectOkAck(context.start(host.userId));
  const view = context.transport.last(host.userId, "game:state");
  return { ...context, host, members, currentPlayerId: view.currentPlayerId! };
}
