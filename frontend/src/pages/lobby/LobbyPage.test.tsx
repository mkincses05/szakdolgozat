import type { RoomView } from "@wildhand/shared";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

/** Replaces the clipboard API of jsdom for one test. */
function setClipboard(clipboard: Pick<Clipboard, "writeText"> | undefined) {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });
}

/** The seat of a room member, found by the displayed name. */
const seatOf = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

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

    expect(screen.getByRole("heading", { name: "Room code" })).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Players (2/8)" })).toBeInTheDocument();
    expect(seatOf("Bela")).toHaveTextContent("host");
    expect(seatOf("Bela")).toHaveTextContent("disconnected");
    expect(seatOf("Anna")).toHaveTextContent("you");
    expect(seatOf("Anna")).not.toHaveTextContent("host");
    expect(seatOf("Anna")).not.toHaveTextContent("disconnected");
    // The free seats fill the room up to its limit.
    expect(screen.getAllByText("Free seat")).toHaveLength(6);
  });

  it("copies the room code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    await renderLobby(roomView("u2"));

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith("ABC123");
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("tells the player when the code cannot be copied", async () => {
    // Insecure origins have no clipboard API.
    setClipboard(undefined);
    await renderLobby(roomView("u2"));

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The code could not be copied.");
  });

  it("lets only the host start the match", async () => {
    await renderLobby(roomView("u2"));
    expect(screen.queryByRole("button", { name: "Start match" })).not.toBeInTheDocument();
    expect(screen.getByText("Waiting for the host to start the match.")).toBeInTheDocument();

    act(() => fakeSocket.receive("room:state", roomView("u1")));
    expect(seatOf("Anna")).toHaveTextContent("you");
    expect(seatOf("Anna")).toHaveTextContent("host");

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
    expect(seatOf("Bot 1")).toHaveTextContent("bot, sampling");
    expect(screen.queryByRole("button", { name: "Add bot" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Bot 1" })).not.toBeInTheDocument();

    act(() => fakeSocket.receive("room:state", withBot("u1")));
    const strength = screen.getByRole("group", { name: "Strength" });
    expect(within(strength).getByRole("button", { name: "heuristic" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(strength).getByRole("button", { name: "rule-based" }));
    expect(within(strength).getByRole("button", { name: "rule-based" })).toHaveAttribute("aria-pressed", "true");
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
