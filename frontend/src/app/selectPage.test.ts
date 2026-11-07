import type { MatchResults, MatchView, RoomView } from "@wildhand/shared";
import { selectPage } from "./selectPage";

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };
const room = (state: RoomView["state"]) => ({ state }) as RoomView;
const match = {} as MatchView;
const results = { matchId: "m1" } as MatchResults;
const empty = { session: null, room: null, match: null, results: null, dismissedMatchId: null };

describe("selectPage", () => {
  it("shows the landing page without a session", () => {
    expect(selectPage(empty)).toBe("landing");
  });

  it("waits for the room state after a session starts or resumes", () => {
    expect(selectPage({ ...empty, session })).toBe("loading");
  });

  it("shows the lobby in a room without a match", () => {
    expect(selectPage({ ...empty, session, room: room("lobby") })).toBe("lobby");
  });

  it("shows the game once the match state has arrived", () => {
    expect(selectPage({ ...empty, session, room: room("in_match") })).toBe("loading");
    expect(selectPage({ ...empty, session, room: room("in_match"), match })).toBe("game");
  });

  it("shows the results of an ended match until they are dismissed", () => {
    const ended = { ...empty, session, room: room("lobby"), match, results };
    expect(selectPage(ended)).toBe("results");
    expect(selectPage({ ...ended, dismissedMatchId: "m1" })).toBe("lobby");
  });

  it("shows the game of a new match even before its results exist", () => {
    expect(selectPage({ ...empty, session, room: room("in_match"), match, results, dismissedMatchId: null })).toBe(
      "game"
    );
  });
});
