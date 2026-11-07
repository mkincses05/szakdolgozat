import { describe, expect, it } from "vitest";
import { PROCESSED_ACTIONS_LIMIT, rememberAck } from "../../src/game/sessions.js";

describe("rememberAck", () => {
  it("keeps the most recent acknowledgements up to the limit and forgets the oldest", () => {
    const acks = new Map<string, number>();
    for (let index = 0; index <= PROCESSED_ACTIONS_LIMIT; index++) {
      rememberAck(acks, `action-${index}`, index);
    }

    expect(acks.size).toBe(PROCESSED_ACTIONS_LIMIT);
    expect(acks.has("action-0")).toBe(false);
    expect(acks.get("action-1")).toBe(1);
    expect(acks.get(`action-${PROCESSED_ACTIONS_LIMIT}`)).toBe(PROCESSED_ACTIONS_LIMIT);
  });
});
