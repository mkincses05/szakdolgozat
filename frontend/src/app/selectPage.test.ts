import type { MatchResults, MatchView, RoomView } from "@wildhand/shared";
import { selectPage } from "./selectPage";

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };
const room = (state: RoomView["state"]) => ({ state }) as RoomView;
const match = {} as MatchView;
const results = { matchId: "m1" } as MatchResults;
const empty = { session: null, room: null, match: null, results: null, dismissedMatchId: null };
const guest = { status: "loggedOut", continuedAsGuest: true } as const;

describe("selectPage", () => {
  it("asks to log in, register, or continue as a guest outside a room", () => {
    expect(selectPage(empty, { status: "loading", continuedAsGuest: false })).toBe("loading");
    expect(selectPage(empty, { status: "loggedOut", continuedAsGuest: false })).toBe("welcome");
    expect(selectPage(empty, { status: "unavailable", continuedAsGuest: false })).toBe("welcome");
  });

  it("shows the landing page to a logged-in player or a guest", () => {
    expect(selectPage(empty, { status: "loggedIn", continuedAsGuest: false })).toBe("landing");
    expect(selectPage(empty, guest)).toBe("landing");
    expect(selectPage(empty, { status: "loading", continuedAsGuest: true })).toBe("landing");
  });

  it("returns to the room regardless of the account", () => {
    const welcome = { status: "loggedOut", continuedAsGuest: false } as const;
    expect(selectPage({ ...empty, session, room: room("lobby") }, welcome)).toBe("lobby");
    expect(selectPage({ ...empty, session, room: room("lobby") }, { status: "loading", continuedAsGuest: false })).toBe("lobby");
  });

  it("waits for the room state after a session starts or resumes", () => {
    expect(selectPage({ ...empty, session }, guest)).toBe("loading");
  });

  it("shows the lobby in a room without a match", () => {
    expect(selectPage({ ...empty, session, room: room("lobby") }, guest)).toBe("lobby");
  });

  it("shows the game once the match state has arrived", () => {
    expect(selectPage({ ...empty, session, room: room("in_match") }, guest)).toBe("loading");
    expect(selectPage({ ...empty, session, room: room("in_match"), match }, guest)).toBe("game");
  });

  it("shows the results of an ended match until they are dismissed", () => {
    const ended = { ...empty, session, room: room("lobby"), match, results };
    expect(selectPage(ended, guest)).toBe("results");
    expect(selectPage({ ...ended, dismissedMatchId: "m1" }, guest)).toBe("lobby");
  });

  it("shows the game of a new match even before its results exist", () => {
    expect(selectPage({ ...empty, session, room: room("in_match"), match, results, dismissedMatchId: null }, guest)).toBe(
      "game"
    );
  });
});
