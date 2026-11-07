import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  MatchView,
  PlayerMatchView,
  ServerToClientEvents,
  SessionInfo
} from "@wildhand/shared";
import { createWildhandServer, type WildhandApp } from "../../src/app.js";
import { silentLogger } from "../game/helpers.js";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type EventName = keyof ServerToClientEvents;
type EventPayload<E extends EventName> = Parameters<ServerToClientEvents[E]>[0];

const WAIT_MS = 2_000;

/** A client that records every server event, so assertions do not race with delivery. */
class TestClient {
  readonly received: { event: EventName; payload: unknown }[] = [];
  private readonly waiters: (() => void)[] = [];

  constructor(readonly socket: ClientSocket) {
    socket.onAny((event: EventName, payload: unknown) => {
      this.received.push({ event, payload });
      for (const waiter of this.waiters.splice(0)) waiter();
    });
  }

  emit<E extends keyof ClientToServerEvents>(event: E, payload: Parameters<ClientToServerEvents[E]>[0]) {
    return (this.socket.timeout(WAIT_MS) as unknown as {
      emitWithAck(event: string, payload: unknown): Promise<{ ok: boolean; code?: string; data?: SessionInfo }>;
    }).emitWithAck(event, payload);
  }

  async waitFor<E extends EventName>(
    event: E,
    predicate: (payload: EventPayload<E>) => boolean = () => true
  ): Promise<EventPayload<E>> {
    const deadline = Date.now() + WAIT_MS;
    for (;;) {
      const match = [...this.received]
        .reverse()
        .find((entry) => entry.event === event && predicate(entry.payload as EventPayload<E>));
      if (match) return match.payload as EventPayload<E>;
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${event}`);
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 50);
      });
    }
  }
}

let app: WildhandApp | null = null;
const clients: TestClient[] = [];

async function startServer(reconnectGraceMs = 5_000): Promise<string> {
  app = createWildhandServer(
    { port: 0, corsOrigin: "*", turnTimeoutMs: 60_000, reconnectGraceMs },
    { logger: silentLogger }
  );
  await new Promise<void>((resolve) => app!.httpServer.listen(0, resolve));
  return `http://localhost:${(app.httpServer.address() as AddressInfo).port}`;
}

async function client(url: string): Promise<TestClient> {
  const socket: ClientSocket = connect(url, { transports: ["websocket"], forceNew: true, reconnection: false });
  const testClient = new TestClient(socket);
  clients.push(testClient);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return testClient;
}

const action = () => ({ actionId: randomUUID() });

async function createRoom(url: string, name = "Host") {
  const host = await client(url);
  const ack = await host.emit("room:create", { ...action(), displayName: name });
  expect(ack.ok).toBe(true);
  return { host, session: ack.data! };
}

afterEach(async () => {
  for (const testClient of clients.splice(0)) testClient.socket.disconnect();
  await app?.close();
  app = null;
});

describe("Socket.IO protocol", () => {
  it("rejects invalid payloads and actions without a session", async () => {
    const url = await startServer();
    const player = await client(url);

    expect(await player.emit("room:create", { ...action(), displayName: "" })).toEqual({
      ok: false,
      code: "invalid_payload"
    });
    expect(await player.emit("room:create", { actionId: "not-a-uuid", displayName: "Anna" } as never)).toEqual({
      ok: false,
      code: "invalid_payload"
    });
    expect(await player.emit("room:start", action())).toEqual({ ok: false, code: "not_in_room" });
  });

  it("answers a repeated room:leave with the original acknowledgement", async () => {
    const url = await startServer();
    const { host } = await createRoom(url);
    const leave = action();

    expect(await host.emit("room:leave", leave)).toEqual({ ok: true });
    // The session is gone, but the connection still remembers the answer to this action.
    expect(await host.emit("room:leave", leave)).toEqual({ ok: true });
    // A new leave is a new action, and there is no session left to leave.
    expect(await host.emit("room:leave", action())).toEqual({ ok: false, code: "not_in_room" });
  });

  it("accepts up to 8 players in a room and rejects the 9th (R1)", async () => {
    const url = await startServer();
    const { session } = await createRoom(url);

    for (let index = 2; index <= 8; index++) {
      const player = await client(url);
      const ack = await player.emit("room:join", { ...action(), roomCode: session.roomCode, displayName: `P${index}` });
      expect(ack.ok).toBe(true);
    }

    const ninth = await client(url);
    expect(await ninth.emit("room:join", { ...action(), roomCode: session.roomCode, displayName: "P9" })).toEqual({
      ok: false,
      code: "room_full"
    });
  });

  it("plays a turn with two clients and keeps them in sync", async () => {
    const url = await startServer();
    const { host, session } = await createRoom(url);
    const guest = await client(url);
    const joined = await guest.emit("room:join", { ...action(), roomCode: session.roomCode.toLowerCase(), displayName: "Guest" });
    expect(joined.ok).toBe(true);

    expect(await guest.emit("room:start", action())).toEqual({ ok: false, code: "not_host" });
    expect(await host.emit("room:start", action())).toEqual({ ok: true });

    const hostView = (await host.waitFor("game:state")) as PlayerMatchView;
    const guestView = (await guest.waitFor("game:state")) as PlayerMatchView;
    expect(hostView.viewer).toBe("player");
    expect(hostView.hand).toHaveLength(7);
    expect(guestView.hand).toHaveLength(7);
    expect(hostView.hand.some((card) => guestView.hand.some((other) => other.id === card.id))).toBe(false);

    const current = hostView.currentPlayerId === session.userId ? host : guest;
    const other = current === host ? guest : host;
    const ack = await current.emit("game:draw", { ...action(), stateVersion: hostView.stateVersion });
    expect(ack).toEqual({ ok: true });

    const next = (view: MatchView) => view.stateVersion > hostView.stateVersion;
    const otherView = await other.waitFor("game:state", next);
    const currentView = await current.waitFor("game:state", next);
    expect(otherView.stateVersion).toBe(currentView.stateVersion);
    expect(otherView.currentPlayerId).toBe(otherView.viewer === "player" ? otherView.userId : null);
    expect(await other.waitFor("game:effect")).toMatchObject({ type: "cardDrawn" });
  });

  it("resumes a session on a new connection within the grace period (R23)", async () => {
    const url = await startServer();
    const { host, session } = await createRoom(url);
    const guest = await client(url);
    const joined = await guest.emit("room:join", { ...action(), roomCode: session.roomCode, displayName: "Guest" });
    expect(await host.emit("room:start", action())).toEqual({ ok: true });
    await guest.waitFor("game:state");

    guest.socket.disconnect();
    await host.waitFor("room:state", (room) => room.members[1]?.presence === "disconnected");

    const returning = await client(url);
    expect(await returning.emit("session:resume", { reconnectToken: joined.data!.reconnectToken })).toEqual({
      ok: true,
      data: joined.data
    });
    const view = (await returning.waitFor("game:state")) as PlayerMatchView;
    expect(view.userId).toBe(joined.data!.userId);
    expect(view.hand).toHaveLength(7);
    await host.waitFor("room:state", (room) => room.members[1]?.presence === "connected");
  });

  it("disconnects the old socket when the same session resumes elsewhere", async () => {
    const url = await startServer();
    const { host, session } = await createRoom(url);

    const replacement = await client(url);
    const disconnected = new Promise<void>((resolve) => host.socket.once("disconnect", () => resolve()));
    expect((await replacement.emit("session:resume", { reconnectToken: session.reconnectToken })).ok).toBe(true);
    await disconnected;

    expect(await replacement.waitFor("room:state")).toMatchObject({ members: [{ presence: "connected" }] });
  });

  it("does not let a connection with a session take over another session", async () => {
    const url = await startServer();
    const { host, session } = await createRoom(url);
    const guest = await client(url);
    const joined = await guest.emit("room:join", { ...action(), roomCode: session.roomCode, displayName: "Guest" });

    expect(await host.emit("session:resume", { reconnectToken: joined.data!.reconnectToken })).toEqual({
      ok: false,
      code: "already_in_room"
    });
    // Resuming the connection's own session again is a harmless retry.
    expect((await host.emit("session:resume", { reconnectToken: session.reconnectToken })).ok).toBe(true);
    expect(guest.socket.connected).toBe(true);
  });

  it("rejects a resume after the grace period has expired", async () => {
    const url = await startServer(100);
    const { session } = await createRoom(url);
    const guest = await client(url);
    const joined = await guest.emit("room:join", { ...action(), roomCode: session.roomCode, displayName: "Guest" });

    guest.socket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const late = await client(url);
    expect(await late.emit("session:resume", { reconnectToken: joined.data!.reconnectToken })).toEqual({
      ok: false,
      code: "session_expired"
    });
  });
});
