import type { Card, PlayerMatchView, RoomView } from "@wildhand/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../../app/App";
import { saveSession } from "../../services/session";
import { fakeSocket } from "../../test/fakeSocket";

vi.mock("../../services/socket", async () => ({ socket: (await import("../../test/fakeSocket")).fakeSocket }));

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };

const red7: Card = { id: "r7", deckInstance: 1, kind: "number", color: "red", number: 7 };
const blue7: Card = { id: "b7", deckInstance: 1, kind: "number", color: "blue", number: 7 };
const red3: Card = { id: "r3", deckInstance: 1, kind: "number", color: "red", number: 3 };
const green5: Card = { id: "g5", deckInstance: 1, kind: "number", color: "green", number: 5 };
const storm: Card = { id: "st", deckInstance: 1, kind: "storm" };
const bluePlus2: Card = { id: "bp", deckInstance: 1, kind: "plus2", color: "blue" };

const room: RoomView = {
  code: "ABC123",
  state: "in_match",
  hostUserId: "u1",
  members: [
    { userId: "u1", displayName: "Anna", presence: "connected" },
    { userId: "u2", displayName: "Bela", presence: "connected" }
  ],
  minPlayers: 2,
  maxPlayers: 8
};

function matchView(overrides: Partial<PlayerMatchView> = {}): PlayerMatchView {
  return {
    viewer: "player",
    userId: "u1",
    matchId: "m1",
    phase: "awaiting_action",
    players: [
      { userId: "u1", displayName: "Anna", seat: 0, handSize: 6, matchStatus: "active", presence: "connected", finishPosition: null, isBot: false },
      { userId: "u2", displayName: "Bela", seat: 1, handSize: 1, matchStatus: "active", presence: "disconnected", finishPosition: null, isBot: false }
    ],
    currentPlayerId: "u1",
    topCard: { id: "r2", deckInstance: 1, kind: "number", color: "red", number: 2 },
    activeColor: null,
    pendingPenalty: 0,
    drawPileSize: 80,
    turnDeadline: Date.now() + 30_000,
    finishingOrder: [],
    stateVersion: 4,
    hand: [red7, blue7, red3, green5, storm, bluePlus2],
    ...overrides
  };
}

async function renderGame(view: PlayerMatchView) {
  saveSession(session);
  fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true, data: session });
  render(<App />);
  await waitFor(() => expect(screen.getByText("Loading…")).toBeInTheDocument());
  act(() => {
    fakeSocket.receive("room:state", room);
    fakeSocket.receive("game:state", view);
  });
}

const cardButton = (name: string) => screen.getByRole("button", { name });

describe("GamePage", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
  });

  it("shows the public match state", async () => {
    await renderGame(matchView());

    expect(screen.getByText("It is your turn.")).toBeInTheDocument();
    expect(screen.getByText("Time left: 30 s")).toBeInTheDocument();
    expect(screen.getByText("Top card: Red 2")).toBeInTheDocument();
    expect(screen.getByText("Draw pile: 80 cards")).toBeInTheDocument();
    expect(screen.getByText("Anna (you): 6 cards – connected – on turn")).toBeInTheDocument();
    expect(screen.getByText("Bela: 1 card – disconnected")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your hand (6 cards)" })).toBeInTheDocument();
  });

  it("enables only the legal cards and builds a combo from the combo partners", async () => {
    await renderGame(matchView());

    expect(cardButton("Red 7")).toBeEnabled();
    expect(cardButton("Red 3")).toBeEnabled();
    expect(cardButton("Storm")).toBeEnabled();
    expect(cardButton("Blue 7")).toBeDisabled();
    expect(cardButton("Green 5")).toBeDisabled();
    expect(cardButton("Blue +2")).toBeDisabled();
    expect(cardButton("Play selected cards")).toBeDisabled();

    fireEvent.click(cardButton("Red 7"));
    expect(cardButton("Red 7")).toHaveAttribute("aria-pressed", "true");
    expect(cardButton("Blue 7")).toBeEnabled();
    expect(cardButton("Red 3")).toBeDisabled();

    fireEvent.click(cardButton("Blue 7"));
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Play selected cards"));

    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith(
      "game:play",
      expect.objectContaining({ cardIds: ["r7", "b7"], stateVersion: 4 })
    );
  });

  it("drops the selection when a new state arrives", async () => {
    await renderGame(matchView());
    fireEvent.click(cardButton("Red 7"));

    act(() => fakeSocket.receive("game:state", matchView({ stateVersion: 5 })));

    expect(cardButton("Red 7")).toHaveAttribute("aria-pressed", "false");
    expect(cardButton("Play selected cards")).toBeDisabled();
  });

  it("labels the draw button with the shared draw option", async () => {
    await renderGame(matchView());
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Draw a card"));
    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith("game:draw", expect.objectContaining({ stateVersion: 4 }));
    // The buttons stay disabled until the acknowledgement arrives.
    await waitFor(() => expect(cardButton("Draw a card")).toBeEnabled());

    act(() => fakeSocket.receive("game:state", matchView({ stateVersion: 5, pendingPenalty: 4 })));
    expect(screen.getByText("+2 penalty: 4 cards")).toBeInTheDocument();
    expect(cardButton("Draw the penalty (4 cards)")).toBeEnabled();
    expect(cardButton("Blue +2")).toBeEnabled();
    expect(cardButton("Red 7")).toBeDisabled();
  });

  it("offers no actions when it is another player's turn", async () => {
    await renderGame(matchView({ currentPlayerId: "u2" }));

    expect(screen.getByText("It is Bela's turn.")).toBeInTheDocument();
    expect(cardButton("Red 7")).toBeDisabled();
    expect(cardButton("Storm")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Draw a card" })).not.toBeInTheDocument();
  });

  it("shows a rejected action until the next state arrives", async () => {
    await renderGame(matchView());
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: false, code: "missing_color" });

    fireEvent.click(cardButton("Storm"));
    fireEvent.click(cardButton("Play selected cards"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a color.");

    act(() => fakeSocket.receive("game:state", matchView({ stateVersion: 5 })));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
