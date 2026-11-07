import { render, screen } from "@testing-library/react";
import { fakeSocket } from "../test/fakeSocket";
import { App } from "./App";

vi.mock("../services/socket", async () => ({ socket: (await import("../test/fakeSocket")).fakeSocket }));

describe("App", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
  });

  it("shows the connection status and the landing page without a session", () => {
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Connected to the server");
    expect(screen.getByRole("heading", { name: "Wildhand" })).toBeInTheDocument();
    expect(screen.getByText("A multiplayer card game")).toBeInTheDocument();
  });
});
