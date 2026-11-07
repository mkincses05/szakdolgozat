// In-memory stand-in for the Socket.IO client. Tests replace `services/socket` with it:
// vi.mock("../services/socket", async () => ({ socket: (await import("../test/fakeSocket")).fakeSocket }));

type Listener = (...args: never[]) => void;

export class FakeSocket {
  connected = false;
  /** Called with the event and the payload of every action; resolves to the acknowledgement. */
  readonly emitWithAck = vi.fn<(event: string, payload: unknown) => Promise<unknown>>();
  private readonly listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): this {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  timeout(): this {
    return this;
  }

  connect(): this {
    this.connected = true;
    this.receive("connect");
    return this;
  }

  disconnect(): this {
    if (this.connected) {
      this.connected = false;
      this.receive("disconnect", "io client disconnect");
    }
    return this;
  }

  /** Simulates an event arriving from the server, or a connection event. */
  receive(event: string, ...args: unknown[]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      (listener as (...args: unknown[]) => void)(...args);
    }
  }

  reset(): void {
    this.connected = false;
    this.listeners.clear();
    this.emitWithAck.mockReset();
  }
}

export const fakeSocket = new FakeSocket();
