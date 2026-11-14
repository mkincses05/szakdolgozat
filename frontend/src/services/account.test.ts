import { fetchProfile, login, logout } from "./account";
import { stubAccountApi } from "../test/accountApi";

describe("account API", () => {
  it("sends the cookie with every request and returns the server's answer", async () => {
    const fetchMock = stubAccountApi({ "/login": { ok: true, data: { id: "a1" } } });

    expect(await login({ login: "anna", password: "secret password" })).toEqual({ ok: true, data: { id: "a1" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ login: "anna", password: "secret password" })
      })
    );

    await logout();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  it("passes on known error codes and replaces unknown ones", async () => {
    stubAccountApi({ "/me": { ok: false, code: "not_logged_in" } });
    expect(await fetchProfile()).toEqual({ ok: false, code: "not_logged_in" });

    stubAccountApi({ "/me": { ok: false, code: "something_new" } });
    expect(await fetchProfile()).toEqual({ ok: false, code: "internal_error" });
  });

  it("reports an unreachable server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    expect(await fetchProfile()).toEqual({ ok: false, code: "no_response" });
  });
});
