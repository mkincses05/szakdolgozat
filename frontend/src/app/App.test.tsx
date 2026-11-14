import { render, screen } from "@testing-library/react";
import { fakeSocket } from "../test/fakeSocket";
import { App } from "./App";
import { saveGuestChoice } from "../services/session";

vi.mock("../services/socket", async () => ({ socket: (await import("../test/fakeSocket")).fakeSocket }));

describe("App", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
    // Without a session these tests start on the landing page, as a guest.
    saveGuestChoice(true);
  });

  it("shows the connection status and the landing page without a session", () => {
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Connected to the server");
    expect(screen.getByRole("heading", { name: "Wildhand" })).toBeInTheDocument();
    expect(screen.getByText("A multiplayer card game")).toBeInTheDocument();
  });
});
