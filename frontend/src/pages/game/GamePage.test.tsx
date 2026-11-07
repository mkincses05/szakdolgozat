import type { Card, PlayerMatchView, RoomView } from "@wildhand/shared";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "../../app/App";
import { saveSession, saveGuestChoice } from "../../services/session";
import { fakeSocket } from "../../test/fakeSocket";

vi.mock("../../services/socket", async () => ({ socket: (await import("../../test/fakeSocket")).fakeSocket }));

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };

const red7: Card = { id: "r7", deckInstance: 1, kind: "number", color: "red", number: 7 };
const blue7: Card = { id: "b7", deckInstance: 1, kind: "number", color: "blue", number: 7 };
const red3: Card = { id: "r3", deckInstance: 1, kind: "number", color: "red", number: 3 };
const green5: Card = { id: "g5", deckInstance: 1, kind: "number", color: "green", number: 5 };
const storm: Card = { id: "st", deckInstance: 1, kind: "storm" };
const bluePlus2: Card = { id: "bp", deckInstance: 1, kind: "plus2", color: "blue" };
const colorChange: Card = { id: "cc", deckInstance: 1, kind: "colorChange" };
const redSwap: Card = { id: "rs", deckInstance: 1, kind: "swap", color: "red" };
const spy: Card = { id: "sp", deckInstance: 1, kind: "spy" };

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
      { userId: "u2", displayName: "Bela", seat: 1, handSize: 1, matchStatus: "active", presence: "disconnected", finishPosition: null, isBot: false },
      { userId: "u3", displayName: "Cili", seat: 2, handSize: 3, matchStatus: "active", presence: "connected", finishPosition: null, isBot: false }
    ],
    currentPlayerId: "u1",
    topCard: { id: "r2", deckInstance: 1, kind: "number", color: "red", number: 2 },
    activeColor: null,
    pendingPenalty: 0,
    drawPileSize: 80,
    // The client clock is 20 s ahead of the server's: the countdown must still show 30 s.
    serverTime: Date.now() - 20_000,
    turnDeadline: Date.now() - 20_000 + 30_000,
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
    // Without a session these tests start on the landing page, as a guest.
    saveGuestChoice(true);
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

describe("GamePage special cards", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
    // Without a session these tests start on the landing page, as a guest.
    saveGuestChoice(true);
  });

  const lastPayload = () => fakeSocket.emitWithAck.mock.lastCall?.[1];

  it("asks for a color before playing Color Change", async () => {
    await renderGame(matchView({ hand: [colorChange, green5] }));

    fireEvent.click(cardButton("Color Change"));
    expect(cardButton("Play selected cards")).toBeDisabled();

    fireEvent.click(cardButton("Blue"));
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Play selected cards"));

    expect(lastPayload()).toMatchObject({ cardIds: ["cc"], chosenColor: "blue", stateVersion: 4 });
  });

  it("asks for a target, a card to give, and a face-down card to take for Swap", async () => {
    await renderGame(matchView({ hand: [redSwap, green5, red3] }));

    fireEvent.click(cardButton("Red Swap"));
    // Bela is disconnected, so only Cili can be targeted.
    expect(screen.queryByRole("button", { name: "Bela" })).not.toBeInTheDocument();
    fireEvent.click(cardButton("Cili"));
    const give = screen.getByRole("group", { name: "Choose a card to give" });
    expect(within(give).getAllByRole("button").map((button) => button.textContent)).toEqual(["Green 5", "Red 3"]);
    fireEvent.click(within(give).getByRole("button", { name: "Green 5" }));
    expect(screen.getAllByRole("button", { name: /^Card \d$/ })).toHaveLength(3);
    expect(cardButton("Play selected cards")).toBeDisabled();

    fireEvent.click(cardButton("Card 2"));
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Play selected cards"));

    expect(lastPayload()).toMatchObject({
      cardIds: ["rs"],
      targetPlayerId: "u3",
      swapCardId: "g5",
      targetCardPosition: 1
    });
  });

  it("plays a last-card Swap with a target only", async () => {
    await renderGame(matchView({ hand: [redSwap] }));

    fireEvent.click(cardButton("Red Swap"));
    fireEvent.click(cardButton("Cili"));
    expect(screen.queryByText("Choose a card to give")).not.toBeInTheDocument();
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Play selected cards"));

    expect(lastPayload()).toMatchObject({ cardIds: ["rs"], targetPlayerId: "u3" });
    expect(lastPayload()).not.toHaveProperty("swapCardId");
  });

  it("asks for a target for Spy", async () => {
    await renderGame(matchView({ hand: [spy, green5] }));

    fireEvent.click(cardButton("Spy"));
    fireEvent.click(cardButton("Cili"));
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Play selected cards"));

    expect(lastPayload()).toMatchObject({ cardIds: ["sp"], targetPlayerId: "u3" });
  });

  it("logs public effects and private Spy and Swap results", async () => {
    await renderGame(matchView());

    act(() => {
      fakeSocket.receive("game:effect", {
        type: "storm",
        stormPlayerId: "u1",
        value: 3,
        draws: [
          { userId: "u2", requested: 3, actual: 3 },
          { userId: "u3", requested: 3, actual: 1 }
        ]
      });
      fakeSocket.receive("game:spyReveal", { targetPlayerId: "u3", hand: [red7, storm] });
      fakeSocket.receive("game:swapResult", { otherPlayerId: "u3", given: green5, received: blue7 });
    });

    const entries = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(entries).toEqual(
      expect.arrayContaining([
        "Anna played Storm with value 3. Cards drawn: Bela 3/3, Cili 1/3.",
        "Spy: the hand of Cili: Red 7, Storm.",
        "Swap: you gave Green 5 to Cili and received Blue 7."
      ])
    );
    // Newest first.
    expect(entries.indexOf("Swap: you gave Green 5 to Cili and received Blue 7.")).toBeLessThan(
      entries.indexOf("Anna played Storm with value 3. Cards drawn: Bela 3/3, Cili 1/3.")
    );
  });

  it("shows a finished player the match as a spectator", async () => {
    const view = matchView({ hand: [], currentPlayerId: "u3" });
    view.players[0] = { ...view.players[0], handSize: 0, matchStatus: "finished", finishPosition: 1 };
    await renderGame(view);

    expect(screen.getByText("You finished in place 1. You are watching the match.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Play selected cards" })).not.toBeInTheDocument();

    // A finished player leaves without forfeiting, so there is nothing to confirm.
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Leave the match"));
    expect(await screen.findByRole("button", { name: "Create room" })).toBeInTheDocument();
  });

  it("asks an active player to confirm the forfeit before leaving", async () => {
    await renderGame(matchView());

    fireEvent.click(cardButton("Leave the match"));
    expect(screen.getByText("If you leave now, you forfeit the match.")).toBeInTheDocument();
    fireEvent.click(cardButton("Stay"));
    expect(fakeSocket.emitWithAck).not.toHaveBeenCalledWith("room:leave", expect.anything());

    fireEvent.click(cardButton("Leave the match"));
    fakeSocket.emitWithAck.mockResolvedValueOnce({ ok: true });
    fireEvent.click(cardButton("Leave and forfeit"));

    expect(await screen.findByRole("button", { name: "Create room" })).toBeInTheDocument();
    expect(fakeSocket.emitWithAck).toHaveBeenLastCalledWith("room:leave", expect.anything());
  });
});
