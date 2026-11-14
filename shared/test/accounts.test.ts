import { describe, expect, it } from "vitest";
import { loginPayloadSchema, registerPayloadSchema } from "../src/index.js";

const valid = { username: "anna_k", email: "anna@example.com", displayName: "Anna", password: "correct horse" };

describe("registerPayloadSchema", () => {
  it("accepts a valid registration and trims the text fields", () => {
    expect(registerPayloadSchema.parse({ ...valid, username: " anna_k ", email: " anna@example.com " })).toEqual(valid);
  });

  it("rejects usernames that could be mistaken for an email or are too short", () => {
    expect(registerPayloadSchema.safeParse({ ...valid, username: "anna@k" }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...valid, username: "an" }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...valid, username: "a".repeat(33) }).success).toBe(false);
  });

  it("rejects invalid emails and passwords outside the allowed length", () => {
    expect(registerPayloadSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...valid, password: "x".repeat(129) }).success).toBe(false);
  });
});

describe("loginPayloadSchema", () => {
  it("accepts a username or an email", () => {
    expect(loginPayloadSchema.safeParse({ login: "anna_k", password: "x" }).success).toBe(true);
    expect(loginPayloadSchema.safeParse({ login: "anna@example.com", password: "x" }).success).toBe(true);
    expect(loginPayloadSchema.safeParse({ login: "", password: "x" }).success).toBe(false);
  });
});
