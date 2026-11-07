import { describe, expect, it } from "vitest";
import { getMatchXp, type Standing } from "../src/index.js";

const standing = (userId: string, position: number, matchStatus: Standing["matchStatus"] = "finished"): Standing => ({
  userId,
  position,
  matchStatus
});

describe("getMatchXp", () => {
  it("gives the winner a bonus for every player behind", () => {
    const standings = [standing("a", 1), standing("b", 2), standing("c", 3), standing("d", 4, "active")];

    expect(standings.map((entry) => getMatchXp(entry, standings))).toEqual([40, 30, 20, 10]);
  });

  it("gives nothing for a forfeit, but counts forfeited players as behind", () => {
    const standings = [standing("a", 1), standing("b", 2, "active"), standing("c", 3, "forfeited")];

    expect(standings.map((entry) => getMatchXp(entry, standings))).toEqual([30, 20, 0]);
  });

  it("does not count players who share a position after a blocked game (R18)", () => {
    const standings = [standing("a", 1), standing("b", 2, "active"), standing("c", 2, "active"), standing("d", 4, "forfeited")];

    expect(standings.map((entry) => getMatchXp(entry, standings))).toEqual([40, 20, 20, 0]);
  });
});
