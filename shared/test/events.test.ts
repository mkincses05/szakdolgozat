import { describe, expect, it } from "vitest";
import { CLIENT_EVENTS, clientPayloadSchemas } from "../src/index.js";

describe("client events", () => {
  it("have a payload schema for every client event", () => {
    expect(Object.keys(clientPayloadSchemas).sort()).toEqual(Object.values(CLIENT_EVENTS).sort());
  });
});
