import type { RoomView } from "@wildhand/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../../app/App";
import { loadSession, saveSession, saveGuestChoice } from "../../services/session";
import { fakeSocket } from "../../test/fakeSocket";

vi.mock("../../services/socket", async () => ({ socket: (await import("../../test/fakeSocket")).fakeSocket }));

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };

function roomView(hostUserId: string): RoomView {
  return {
    code: "ABC123",
    state: "lobby",
    hostUserId,
    members: [
      { userId: "u2", displayName: "Bela", presence: "disconnected", isBot: false, botLevel: null },
      { userId: "u1", displayName: "Anna", presence: "connected", isBot: false, botLevel: null }
    ],
    minPlayers: 2,
    maxPlayers: 8
  };
}

/** Renders the app with a resumed session in the given room. */
async function renderLobby(room: RoomView) {
  saveSession(session);
  fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true, data: session });
  render(<App />);
  await waitFor(() => expect(screen.getByText("Loading…")).toBeInTheDocument());
  act(() => fakeSocket.receive("room:state", room));
}

describe("LobbyPage", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
    // Without a session these tests start on the landing page, as a guest.
    saveGuestChoice(true);
  });

  it("shows the room code and the members", async () => {
    await renderLobby(roomView("u2"));

    expect(screen.getByText(/Room code: ABC123/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Players (2/8)" })).toBeInTheDocument();
    expect(screen.getByText("Bela (host) – disconnected")).toBeInTheDocument();
    expect(screen.getByText("Anna (you) – connected")).toBeInTheDocument();
  });

  it("lets only the host start the match", async () => {
    await renderLobby(roomView("u2"));
    expect(screen.queryByRole("button", { name: "Start match" })).not.toBeInTheDocument();
    expect(screen.getByText("Waiting for the host to start the match.")).toBeInTheDocument();

    act(() => fakeSocket.receive("room:state", roomView("u1")));
    expect(screen.getByText("Anna (you, host) – connected")).toBeInTheDocument();

    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: false, code: "not_enough_players" });
    fireEvent.click(screen.getByRole("button", { name: "Start match" }));

    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith("room:start", expect.objectContaining({ actionId: expect.any(String) }));
    expect(await screen.findByRole("alert")).toHaveTextContent("There are not enough players to start the match.");
  });

  it("lets only the host add and remove bots, and shows their level", async () => {
    const withBot = (hostUserId: string): RoomView => ({
      ...roomView(hostUserId),
      members: [
        ...roomView(hostUserId).members,
        { userId: "bot-1", displayName: "Bot 1", presence: "connected", isBot: true, botLevel: "sampling" }
      ]
    });

    await renderLobby(withBot("u2"));
    expect(screen.getByText("Bot 1 (bot, sampling) – connected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add bot" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Bot 1" })).not.toBeInTheDocument();

    act(() => fakeSocket.receive("room:state", withBot("u1")));
    fireEvent.change(screen.getByRole("combobox", { name: "Strength" }), { target: { value: "rule_based" } });
    expect(screen.getByText("Follows fixed priorities, for example answers a +2 with a +2.")).toBeInTheDocument();

    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: false, code: "room_full" });
    fireEvent.click(screen.getByRole("button", { name: "Add bot" }));
    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith(
      "room:addBot",
      expect.objectContaining({ level: "rule_based", actionId: expect.any(String) })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("The room is full.");

    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Remove Bot 1" }));
    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith(
      "room:removeBot",
      expect.objectContaining({ botId: "bot-1", actionId: expect.any(String) })
    );
  });

  it("returns to the landing page after leaving", async () => {
    await renderLobby(roomView("u1"));

    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));

    expect(await screen.findByRole("button", { name: "Create room" })).toBeInTheDocument();
    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith("room:leave", expect.objectContaining({ actionId: expect.any(String) }));
    expect(loadSession()).toBeNull();
    // A match may have changed the XP, so the profile is fetched again.
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/api/auth/me"))).toHaveLength(2);
  });
});
