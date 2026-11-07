import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders texts from the common and the page namespace", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Wildhand" })).toBeInTheDocument();
    expect(screen.getByText("A multiplayer card game")).toBeInTheDocument();
  });
});
