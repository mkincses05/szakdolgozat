import { clearSession, loadSession, saveSession } from "./session";

const session = { userId: "u1", roomCode: "ABC123", reconnectToken: "token" };

describe("session storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("saves, loads, and clears the session", () => {
    expect(loadSession()).toBeNull();

    saveSession(session);
    expect(loadSession()).toEqual(session);

    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("ignores invalid stored values", () => {
    sessionStorage.setItem("wildhand.session", "not json");
    expect(loadSession()).toBeNull();

    sessionStorage.setItem("wildhand.session", JSON.stringify({ userId: "u1" }));
    expect(loadSession()).toBeNull();
  });
});
