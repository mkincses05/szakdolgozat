import type { AccountProfile } from "@wildhand/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../../app/App";
import { loadGuestChoice } from "../../services/session";
import { stubAccountApi } from "../../test/accountApi";
import { fakeSocket } from "../../test/fakeSocket";

vi.mock("../../services/socket", async () => ({ socket: (await import("../../test/fakeSocket")).fakeSocket }));

const profile: AccountProfile = {
  id: "a1",
  username: "anna_k",
  email: "anna@example.com",
  displayName: "Anna",
  xp: 40,
  matchesPlayed: 3,
  wins: 1,
  forfeits: 0
};

function typeInto(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("WelcomePage", () => {
  beforeEach(() => {
    fakeSocket.reset();
    sessionStorage.clear();
  });

  it("is shown first and lets the player continue as a guest", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Continue as a guest" }));

    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(loadGuestChoice()).toBe(true);
  });

  it("logs in, reconnects the socket for the cookie, and shows the profile", async () => {
    const answers: Parameters<typeof stubAccountApi>[0] = { "/login": { ok: true, data: profile } };
    const fetchMock = stubAccountApi(answers);
    render(<App />);
    const disconnect = vi.spyOn(fakeSocket, "disconnect");

    fireEvent.click(await screen.findByRole("button", { name: "Log in" }));
    typeInto("Username or email", " anna@example.com ");
    typeInto("Password", "correct horse");
    // From now on the cookie identifies the account.
    answers["/me"] = { ok: true, data: profile };
    fireEvent.click(screen.getAllByRole("button", { name: "Log in" })[1]);

    expect(await screen.findByText("Logged in as Anna (anna_k)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/login",
      expect.objectContaining({ body: JSON.stringify({ login: "anna@example.com", password: "correct horse" }) })
    );
    expect(disconnect).toHaveBeenCalled();
    expect(fakeSocket.connected).toBe(true);
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
  });

  it("shows the translated error of a failed login", async () => {
    stubAccountApi({ "/login": { ok: false, code: "invalid_credentials" } });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Log in" }));
    typeInto("Username or email", "anna_k");
    typeInto("Password", "wrong");
    fireEvent.click(screen.getAllByRole("button", { name: "Log in" })[1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("The username, email, or password is incorrect.");
  });

  it("checks every registration field before sending and shows the server's answer", async () => {
    const fetchMock = stubAccountApi({ "/register": { ok: false, code: "username_taken" } });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Register" }));
    typeInto("Username", "a@b");
    typeInto("Email", "not-an-email");
    typeInto("Password", "short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "The username must be 3–32 characters long and contain only letters, digits, and the characters . _ -",
      "Enter a valid email address.",
      "The display name must be 1–24 characters long.",
      "The password must be 8–128 characters long."
    ]);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/register"), expect.anything());

    typeInto("Username", "anna_k");
    typeInto("Email", "anna@example.com");
    typeInto("Display name", "Anna");
    typeInto("Password", "correct horse");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This username is already taken.");
  });

  it("offers only the guest option when the server cannot handle accounts", async () => {
    stubAccountApi({ "/me": { ok: false, code: "database_unavailable" } });
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Accounts are not available right now.");
    expect(screen.queryByRole("button", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue as a guest" })).toBeInTheDocument();
  });

  it("stays logged in and shows the error when the server does not confirm the logout", async () => {
    stubAccountApi({ "/me": { ok: true, data: profile }, "/logout": { ok: false, code: "internal_error" } });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on the server.");
    expect(screen.getByText("Logged in as Anna (anna_k)")).toBeInTheDocument();
  });

  it("logs out from the landing page and returns to the welcome page", async () => {
    stubAccountApi({ "/me": { ok: true, data: profile } });
    render(<App />);

    expect(await screen.findByText("Experience points")).toBeInTheDocument();
    stubAccountApi();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Continue as a guest" })).toBeInTheDocument());
  });
});
