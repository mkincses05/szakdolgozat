import { describe, expect, it } from "vitest";
import { clearedLoginCookie, loginCookie, readLoginCookie } from "../../src/auth/cookies.js";

describe("login cookie", () => {
  it("reads the token among other cookies and ignores malformed values", () => {
    expect(readLoginCookie("theme=dark; wildhand_session=abc_DEF-123; lang=hu")).toBe("abc_DEF-123");
    expect(readLoginCookie("wildhand_session=%E0%A4%A")).toBeUndefined();
    expect(readLoginCookie("other=1")).toBeUndefined();
    expect(readLoginCookie(undefined)).toBeUndefined();
  });

  it("is HttpOnly and SameSite=Lax, and Secure only when requested", () => {
    expect(loginCookie("token", new Date(61_000), 1_000, false)).toBe(
      "wildhand_session=token; Path=/; Max-Age=60; HttpOnly; SameSite=Lax"
    );
    expect(loginCookie("token", new Date(61_000), 1_000, true)).toMatch(/; Secure$/);
    expect(clearedLoginCookie(false)).toBe("wildhand_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  });
});
