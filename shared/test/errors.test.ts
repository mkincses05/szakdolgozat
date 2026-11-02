import { describe, expect, it } from "vitest";
import { ERROR_CODES, isErrorCode } from "../src/index.js";

describe("error codes", () => {
  it("are unique snake_case keys", () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    expect(ERROR_CODES.every((code) => /^[a-z]+(_[a-z]+)*$/.test(code))).toBe(true);
  });

  it("recognizes known codes only", () => {
    expect(isErrorCode("stale_state")).toBe(true);
    expect(isErrorCode("unknown_code")).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});
