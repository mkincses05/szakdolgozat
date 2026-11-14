import { DatabaseError } from "pg";
import { describe, expect, it } from "vitest";
import { isDatabaseUnavailable } from "../../src/db/errors.js";

function databaseError(code: string): DatabaseError {
  const error = new DatabaseError("server error", 0, "error");
  error.code = code;
  return error;
}

describe("isDatabaseUnavailable", () => {
  it("recognizes connection failures and timeouts of the pg client", () => {
    expect(isDatabaseUnavailable(new Error("Connection terminated due to connection timeout"))).toBe(true);
    expect(isDatabaseUnavailable(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(isDatabaseUnavailable(new Error("Query read timeout"))).toBe(true);
    expect(isDatabaseUnavailable(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }))).toBe(true);
  });

  it("recognizes a server that cannot serve the request", () => {
    expect(isDatabaseUnavailable(databaseError("08006"))).toBe(true);
    expect(isDatabaseUnavailable(databaseError("53300"))).toBe(true);
    expect(isDatabaseUnavailable(databaseError("57P01"))).toBe(true);
  });

  it("keeps real bugs and other errors apart", () => {
    // 42703: undefined_column, a bug in the SQL
    expect(isDatabaseUnavailable(databaseError("42703"))).toBe(false);
    expect(isDatabaseUnavailable(databaseError("23505"))).toBe(false);
    expect(isDatabaseUnavailable(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isDatabaseUnavailable("timeout")).toBe(false);
  });
});
