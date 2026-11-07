import { fakeSocket } from "../test/fakeSocket";
import { resumeSession, sendAction } from "./actions";

vi.mock("./socket", async () => ({ socket: (await import("../test/fakeSocket")).fakeSocket }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("actions", () => {
  beforeEach(() => {
    fakeSocket.reset();
    fakeSocket.connected = true;
  });

  it("sends the payload with a fresh actionId and returns the acknowledgement", async () => {
    fakeSocket.emitWithAck.mockResolvedValue({ ok: false, code: "room_full" });

    await expect(sendAction("room:join", { roomCode: "ABC123", displayName: "Anna" })).resolves.toEqual({
      ok: false,
      code: "room_full"
    });
    await sendAction("room:start", {});

    const [[event, payload], [, second]] = fakeSocket.emitWithAck.mock.calls as [string, { actionId: string }][];
    expect(event).toBe("room:join");
    expect(payload).toMatchObject({ roomCode: "ABC123", displayName: "Anna", actionId: expect.stringMatching(UUID) });
    expect(second.actionId).not.toBe(payload.actionId);
  });

  it("resumes a session without an actionId", async () => {
    const data = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };
    fakeSocket.emitWithAck.mockResolvedValue({ ok: true, data });

    await expect(resumeSession("token")).resolves.toEqual({ ok: true, data });
    expect(fakeSocket.emitWithAck).toHaveBeenCalledWith("session:resume", { reconnectToken: "token" });
  });

  it("does not send while disconnected", async () => {
    fakeSocket.connected = false;

    await expect(sendAction("room:start", {})).resolves.toEqual({ ok: false, code: "not_connected" });
    expect(fakeSocket.emitWithAck).not.toHaveBeenCalled();
  });

  it("reports a missing acknowledgement", async () => {
    fakeSocket.emitWithAck.mockRejectedValue(new Error("operation has timed out"));

    await expect(sendAction("room:start", {})).resolves.toEqual({ ok: false, code: "no_response" });
  });
});
