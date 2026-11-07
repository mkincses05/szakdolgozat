import type { MatchResults, PlayerMatchView, RoomView } from "@wildhand/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../../app/App";
import { loadSession, saveSession } from "../../services/session";
import { fakeSocket } from "../../test/fakeSocket";

vi.mock("../../services/socket", async () => ({ socket: (await import("../../test/fakeSocket")).fakeSocket }));

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };

const room: RoomView = {
  code: "ABC123",
  state: "lobby",
  hostUserId: "u1",
  members: [
    { userId: "u1", displayName: "Anna", presence: "connected" },
    { userId: "u2", displayName: "Bela", presence: "connected" }
  ],
  minPlayers: 2,
  maxPlayers: 8
};

const player = (userId: string, displayName: string, seat: number) => ({
  userId,
  displayName,
  seat,
  handSize: 0,
  matchStatus: "active" as const,
  presence: "connected" as const,
  finishPosition: null,
  isBot: false
});

// Cili has left the room, so her name is known only from the match view.
const endedMatch = {
  viewer: "player",
  userId: "u1",
  matchId: "m1",
  phase: "ended",
  players: [player("u1", "Anna", 0), player("u2", "Bela", 1), player("u3", "Cili", 2), player("u4", "Dani", 3)],
  currentPlayerId: null,
  topCard: { id: "r2", deckInstance: 1, kind: "number", color: "red", number: 2 },
  activeColor: null,
  pendingPenalty: 0,
  drawPileSize: 10,
  turnDeadline: null,
  serverTime: 0,
  finishingOrder: ["u2"],
  stateVersion: 40,
  hand: []
} as PlayerMatchView;

const results: MatchResults = {
  matchId: "m1",
  endReason: "blocked",
  winnerId: "u2",
  standings: [
    { userId: "u2", position: 1, matchStatus: "finished" },
    { userId: "u1", position: 2, matchStatus: "active" },
    { userId: "u4", position: 2, matchStatus: "active" },
    { userId: "u3", position: 4, matchStatus: "forfeited" }
  ]
};

async function renderResults() {
  saveSession(session);
  fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true, data: session });
  render(<App />);
  await waitFor(() => expect(screen.getByText("Loading…")).toBeInTheDocument());
  act(() => {
    fakeSocket.receive("game:state", endedMatch);
    fakeSocket.receive("game:ended", results);
    fakeSocket.receive("room:state", room);
  });
}

describe("ResultsPage", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
  });

  it("shows the winner, the end reason, and the standings from the server", async () => {
    await renderResults();

    expect(screen.getByRole("heading", { name: "Results" })).toBeInTheDocument();
    expect(screen.getByText("Winner: Bela")).toBeInTheDocument();
    expect(screen.getByText(/every remaining player held 20 cards/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "1. Bela",
      "2. Anna (you)",
      "2. Dani",
      "4. Cili – forfeited"
    ]);
  });

  it("returns to the lobby of the same room", async () => {
    await renderResults();

    fireEvent.click(screen.getByRole("button", { name: "Back to the lobby" }));

    expect(screen.getByRole("heading", { name: "Lobby" })).toBeInTheDocument();
    expect(loadSession()).toEqual(session);
  });

  it("leaves the room", async () => {
    await renderResults();

    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));

    expect(await screen.findByRole("button", { name: "Create room" })).toBeInTheDocument();
    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith("room:leave", expect.anything());
    expect(loadSession()).toBeNull();
  });
});
