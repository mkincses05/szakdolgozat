import type { RoomView } from "@wildhand/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { loadSession, saveSession } from "../services/session";
import { fakeSocket } from "../test/fakeSocket";
import { useServerConnection } from "./useServerConnection";

vi.mock("../services/socket", async () => ({ socket: (await import("../test/fakeSocket")).fakeSocket }));

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };
const room = { code: "ABC123", state: "lobby" } as RoomView;

describe("useServerConnection", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
  });

  it("connects and keeps the latest server state", () => {
    const { result } = renderHook(() => useServerConnection());
    expect(result.current.connection).toBe("connected");
    expect(fakeSocket.emitWithAck).not.toHaveBeenCalled();

    act(() => fakeSocket.receive("room:state", room));
    expect(result.current.room).toBe(room);

    const updated = { ...room, state: "in_match" } as RoomView;
    act(() => fakeSocket.receive("room:state", updated));
    expect(result.current.room).toBe(updated);
  });

  it("resumes the stored session on connect", async () => {
    saveSession(session);
    fakeSocket.emitWithAck.mockResolvedValue({ ok: true, data: session });

    const { result } = renderHook(() => useServerConnection());

    expect(fakeSocket.emitWithAck).toHaveBeenCalledWith("session:resume", { reconnectToken: "token" });
    await waitFor(() => expect(result.current.session).toEqual(session));
  });

  it("forgets a session that can no longer be resumed", async () => {
    saveSession(session);
    fakeSocket.emitWithAck.mockResolvedValue({ ok: false, code: "session_expired" });

    const { result } = renderHook(() => useServerConnection());

    await waitFor(() => expect(result.current.sessionError).toBe("session_expired"));
    expect(result.current.session).toBeNull();
    expect(loadSession()).toBeNull();
  });

  it("tells a lost connection apart from a session opened in another tab", () => {
    const { result } = renderHook(() => useServerConnection());

    act(() => fakeSocket.receive("disconnect", "transport close"));
    expect(result.current.connection).toBe("reconnecting");

    act(() => fakeSocket.receive("disconnect", "io server disconnect"));
    expect(result.current.connection).toBe("replaced");
  });

  it("starts, dismisses, and ends a session", () => {
    const { result } = renderHook(() => useServerConnection());

    act(() => result.current.startSession(session));
    expect(result.current.session).toEqual(session);
    expect(loadSession()).toEqual(session);

    act(() => fakeSocket.receive("game:ended", { matchId: "m1" }));
    act(() => result.current.dismissResults());
    expect(result.current.dismissedMatchId).toBe("m1");

    act(() => result.current.endSession());
    expect(result.current.session).toBeNull();
    expect(result.current.results).toBeNull();
    expect(loadSession()).toBeNull();
  });
});
