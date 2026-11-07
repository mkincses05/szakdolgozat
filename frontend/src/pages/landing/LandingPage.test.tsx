import type { RoomView } from "@wildhand/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../../app/App";
import i18n from "../../i18n";
import { loadSession, saveGuestChoice } from "../../services/session";
import { stubAccountApi } from "../../test/accountApi";
import { fakeSocket } from "../../test/fakeSocket";

vi.mock("../../services/socket", async () => ({ socket: (await import("../../test/fakeSocket")).fakeSocket }));

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };

function typeInto(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("LandingPage", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
    // Without a session these tests start on the landing page, as a guest.
    saveGuestChoice(true);
  });

  afterEach(() => i18n.changeLanguage("en"));

  it("creates a room and moves on once the room state arrives", async () => {
    fakeSocket.emitWithAck.mockResolvedValue({ ok: true, data: session });
    render(<App />);

    typeInto("Your name", "  Anna  ");
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(fakeSocket.emitWithAck).toHaveBeenCalledWith(
      "room:create",
      expect.objectContaining({ displayName: "Anna" })
    );
    await waitFor(() => expect(screen.getByText("Loading…")).toBeInTheDocument());
    expect(loadSession()).toEqual(session);

    const room: RoomView = {
      code: "ABC123",
      state: "lobby",
      hostUserId: "u1",
      members: [{ userId: "u1", displayName: "Anna", presence: "connected" }],
      minPlayers: 2,
      maxPlayers: 8
    };
    act(() => fakeSocket.receive("room:state", room));
    expect(screen.getByRole("heading", { name: "Lobby" })).toBeInTheDocument();
  });

  it("joins a room with a normalized room code", () => {
    fakeSocket.emitWithAck.mockResolvedValue({ ok: true, data: session });
    render(<App />);

    typeInto("Your name", "Anna");
    typeInto("Room code", "abc123");
    fireEvent.click(screen.getByRole("button", { name: "Join room" }));

    expect(fakeSocket.emitWithAck).toHaveBeenCalledWith(
      "room:join",
      expect.objectContaining({ roomCode: "ABC123", displayName: "Anna" })
    );
  });

  it("validates the inputs before sending anything", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Create room" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Your name must be 1–24 characters long.");

    typeInto("Your name", "Anna");
    typeInto("Room code", "AB");
    fireEvent.click(screen.getByRole("button", { name: "Join room" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The room code consists of 6 letters or digits.");

    expect(fakeSocket.emitWithAck).not.toHaveBeenCalled();
  });

  it("shows the translated server error", async () => {
    fakeSocket.emitWithAck.mockResolvedValue({ ok: false, code: "room_not_found" });
    render(<App />);

    typeInto("Your name", "Anna");
    typeInto("Room code", "ABC123");
    fireEvent.click(screen.getByRole("button", { name: "Join room" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("There is no room with this code.");
    expect(loadSession()).toBeNull();
  });

  it("switches the language", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "hu" } });

    expect(await screen.findByRole("button", { name: "Szoba létrehozása" })).toBeInTheDocument();
  });
  it("creates a room under the account name when logged in", async () => {
    stubAccountApi({
      "/me": {
        ok: true,
        data: { id: "a1", username: "anna_k", email: "anna@example.com", displayName: "Anna", xp: 40, matchesPlayed: 3, wins: 1, forfeits: 0 }
      }
    });
    fakeSocket.emitWithAck.mockResolvedValue({ ok: true, data: session });
    render(<App />);

    expect(await screen.findByText("Logged in as Anna (anna_k)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(fakeSocket.emitWithAck).toHaveBeenCalledWith("room:create", expect.objectContaining({ displayName: "Anna" }));
  });
});
