import { describe, expect, it } from "vitest";
import {
  HAND_LIMIT,
  gameDrawPayloadSchema,
  gamePlayPayloadSchema,
  roomCreatePayloadSchema,
  roomJoinPayloadSchema,
  sessionResumePayloadSchema
} from "../src/index.js";

const actionId = "6f1c2a0e-8b4d-4c3a-9e2f-1a2b3c4d5e6f";

describe("room payloads", () => {
  it("trims the display name and rejects empty or too long names", () => {
    expect(roomCreatePayloadSchema.parse({ actionId, displayName: "  Anna  " }).displayName).toBe("Anna");
    expect(roomCreatePayloadSchema.safeParse({ actionId, displayName: "   " }).success).toBe(false);
    expect(roomCreatePayloadSchema.safeParse({ actionId, displayName: "x".repeat(25) }).success).toBe(false);
  });

  it("normalizes the room code to upper case and validates its format", () => {
    expect(roomJoinPayloadSchema.parse({ actionId, roomCode: "ab12cd", displayName: "Bence" }).roomCode).toBe("AB12CD");
    expect(roomJoinPayloadSchema.safeParse({ actionId, roomCode: "AB12", displayName: "Bence" }).success).toBe(false);
    expect(roomJoinPayloadSchema.safeParse({ actionId, roomCode: "AB-12C", displayName: "Bence" }).success).toBe(false);
  });

  it("requires a UUID action ID", () => {
    expect(roomCreatePayloadSchema.safeParse({ actionId: "abc", displayName: "Anna" }).success).toBe(false);
    expect(roomCreatePayloadSchema.safeParse({ displayName: "Anna" }).success).toBe(false);
  });
});

describe("game:play payload", () => {
  const base = { actionId, stateVersion: 3 };

  it("accepts a number combo", () => {
    expect(gamePlayPayloadSchema.safeParse({ ...base, cardIds: ["d1-red-7-a", "d1-blue-7-b"] }).success).toBe(true);
  });

  it("accepts a Color Change with a chosen color and rejects an unknown color", () => {
    expect(gamePlayPayloadSchema.safeParse({ ...base, cardIds: ["d1-colorChange-a"], chosenColor: "green" }).success).toBe(true);
    expect(gamePlayPayloadSchema.safeParse({ ...base, cardIds: ["d1-colorChange-a"], chosenColor: "purple" }).success).toBe(false);
  });

  it("accepts a Swap with its selections and a last-card Swap without them", () => {
    const swap = { ...base, cardIds: ["d1-red-swap-a"], targetPlayerId: "user-2" };
    expect(gamePlayPayloadSchema.safeParse({ ...swap, swapCardId: "d1-red-3-a", targetCardPosition: 0 }).success).toBe(true);
    expect(gamePlayPayloadSchema.safeParse(swap).success).toBe(true);
  });

  it("requires swapCardId and targetCardPosition together", () => {
    const swap = { ...base, cardIds: ["d1-red-swap-a"], targetPlayerId: "user-2" };
    expect(gamePlayPayloadSchema.safeParse({ ...swap, swapCardId: "d1-red-3-a" }).success).toBe(false);
    expect(gamePlayPayloadSchema.safeParse({ ...swap, targetCardPosition: 1 }).success).toBe(false);
  });

  it("rejects a swapCardId that is also played", () => {
    const payload = { ...base, cardIds: ["d1-red-swap-a"], targetPlayerId: "u", swapCardId: "d1-red-swap-a", targetCardPosition: 0 };
    expect(gamePlayPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a target position outside the hand limit", () => {
    const swap = { ...base, cardIds: ["d1-red-swap-a"], targetPlayerId: "u", swapCardId: "d1-red-3-a" };
    expect(gamePlayPayloadSchema.safeParse({ ...swap, targetCardPosition: HAND_LIMIT }).success).toBe(false);
    expect(gamePlayPayloadSchema.safeParse({ ...swap, targetCardPosition: -1 }).success).toBe(false);
    expect(gamePlayPayloadSchema.safeParse({ ...swap, targetCardPosition: 0.5 }).success).toBe(false);
  });

  it("rejects empty, duplicate, or too many card IDs", () => {
    expect(gamePlayPayloadSchema.safeParse({ ...base, cardIds: [] }).success).toBe(false);
    expect(gamePlayPayloadSchema.safeParse({ ...base, cardIds: ["d1-red-7-a", "d1-red-7-a"] }).success).toBe(false);
    const tooMany = Array.from({ length: HAND_LIMIT + 1 }, (_, index) => `card-${index}`);
    expect(gamePlayPayloadSchema.safeParse({ ...base, cardIds: tooMany }).success).toBe(false);
  });

  it("requires a non-negative integer state version", () => {
    expect(gamePlayPayloadSchema.safeParse({ actionId, cardIds: ["d1-red-7-a"] }).success).toBe(false);
    expect(gamePlayPayloadSchema.safeParse({ actionId, stateVersion: -1, cardIds: ["d1-red-7-a"] }).success).toBe(false);
  });
});

describe("other payloads", () => {
  it("validates game:draw and session:resume", () => {
    expect(gameDrawPayloadSchema.safeParse({ actionId, stateVersion: 0 }).success).toBe(true);
    expect(gameDrawPayloadSchema.safeParse({ actionId }).success).toBe(false);
    expect(sessionResumePayloadSchema.safeParse({ reconnectToken: "token" }).success).toBe(true);
    expect(sessionResumePayloadSchema.safeParse({ reconnectToken: "" }).success).toBe(false);
  });
});
