// Computer players in rooms and live matches (docs/03 section 3, R1, R21, R24).

import { describe, expect, it } from "vitest";
import { MAX_PLAYERS } from "@wildhand/shared";
import type { MatchRecord, MatchResultStore } from "../../src/persistence/match-result-store.js";
import { expectOkAck, nextActionId, setup } from "./helpers.js";

const BOT_SETTINGS = { thinkDelay: { minMs: 50, maxMs: 50 }, samplingBudgetMs: 1, samplingWorkers: 0 };

function recordingStore(): { records: MatchRecord[]; store: MatchResultStore } {
  const records: MatchRecord[] = [];
  return { records, store: { save: async (record) => void records.push(record) } };
}

function botRoom(levels: Parameters<ReturnType<typeof setup>["service"]["addBot"]>[2][], seed = 3) {
  const { records, store } = recordingStore();
  const context = setup(seed, { bots: BOT_SETTINGS, results: store });
  const host = context.create("Host");
  for (const level of levels) {
    expectOkAck(context.service.addBot(host.userId, nextActionId(), level));
  }
  return { ...context, host, records };
}

describe("bots in the lobby", () => {
  it("lets the host add and remove bots, which appear as members", () => {
    const { service, transport, host } = botRoom(["random", "sampling"]);

    const room = transport.last(host.userId, "room:state");
    expect(room.members.map(({ displayName, isBot, botLevel }) => ({ displayName, isBot, botLevel }))).toEqual([
      { displayName: "Host", isBot: false, botLevel: null },
      { displayName: "Bot 1", isBot: true, botLevel: "random" },
      { displayName: "Bot 2", isBot: true, botLevel: "sampling" }
    ]);

    const firstBot = room.members[1].userId;
    expectOkAck(service.removeBot(host.userId, nextActionId(), firstBot));
    expect(transport.last(host.userId, "room:state").members.map((member) => member.displayName)).toEqual([
      "Host",
      "Bot 2"
    ]);
    expect(service.removeBot(host.userId, nextActionId(), firstBot)).toEqual({ ok: false, code: "bot_not_found" });

    // The freed name is used again.
    expectOkAck(service.addBot(host.userId, nextActionId(), "heuristic"));
    expect(transport.last(host.userId, "room:state").members.map((member) => member.displayName)).toContain("Bot 1");
  });

  it("allows only the host, only in the lobby, and only up to the player limit (R1)", () => {
    const { service, join, host } = botRoom([]);
    const guest = join(host.roomCode, "Guest");

    expect(service.addBot(guest.userId, nextActionId(), "random")).toEqual({ ok: false, code: "not_host" });
    expectOkAck(service.startMatch(host.userId, nextActionId()));
    expect(service.addBot(host.userId, nextActionId(), "random")).toEqual({ ok: false, code: "room_in_match" });
    expectOkAck(service.leaveRoom(guest.userId, nextActionId()));

    // The match ended when the guest left; the room is back in the lobby with the host alone.
    for (let count = 1; count < MAX_PLAYERS; count++) {
      expectOkAck(service.addBot(host.userId, nextActionId(), "random"));
    }
    expect(service.addBot(host.userId, nextActionId(), "random")).toEqual({ ok: false, code: "room_full" });
    expect(service.joinRoom(null, host.roomCode, "Late", () => {})).toEqual({ ok: false, code: "room_full" });
  });

  it("never sends messages to bots and never makes a bot the host (R24)", () => {
    const { service, transport, join, host } = botRoom(["random"]);
    const second = join(host.roomCode, "Second");

    expectOkAck(service.leaveRoom(host.userId, nextActionId()));
    const room = transport.last(second.userId, "room:state");
    expect(room.hostUserId).toBe(second.userId);
    expect(transport.messages.some((message) => message.userId.startsWith("bot-"))).toBe(false);
  });

  it("closes the room when the last human leaves", () => {
    const { service, host } = botRoom(["random", "random"]);
    expectOkAck(service.leaveRoom(host.userId, nextActionId()));
    expect(service.joinRoom(null, host.roomCode, "Late", () => {})).toEqual({ ok: false, code: "room_not_found" });
  });
});

describe("bots in a match", () => {
  it("plays a whole match with bots of every level and stores them as bots", async () => {
    const { service, transport, scheduler, start, host, records } = botRoom(["random", "rule_based", "heuristic", "sampling"]);
    expectOkAck(start(host.userId));

    // The human never acts: the turn timer draws for them (R22), the bots play on their own.
    for (let step = 0; step < 20_000 && transport.to(host.userId, "game:ended").length === 0; step++) {
      scheduler.advance(50);
    }

    const results = transport.last(host.userId, "game:ended");
    expect(results.standings).toHaveLength(5);
    expect(transport.messages.some((message) => message.userId.startsWith("bot-"))).toBe(false);

    await service.flushResults();
    expect(records).toHaveLength(1);
    expect(records[0].players.map(({ kind, botLevel }) => ({ kind, botLevel }))).toEqual([
      { kind: "guest", botLevel: null },
      { kind: "bot", botLevel: "random" },
      { kind: "bot", botLevel: "rule_based" },
      { kind: "bot", botLevel: "heuristic" },
      { kind: "bot", botLevel: "sampling" }
    ]);
  });

  it("shows the bots and their levels in the match view", () => {
    const { transport, start, host } = botRoom(["heuristic"]);
    expectOkAck(start(host.userId));
    const view = transport.last(host.userId, "game:state");
    expect(view.players.map(({ isBot, botLevel }) => ({ isBot, botLevel }))).toEqual([
      { isBot: false, botLevel: null },
      { isBot: true, botLevel: "heuristic" }
    ]);
  });

  it("ends the match without humans when the last human leaves (R21), and stores it", async () => {
    const { service, start, host, records } = botRoom(["random", "random", "random"]);
    expectOkAck(start(host.userId));

    expectOkAck(service.leaveRoom(host.userId, nextActionId()));
    await service.flushResults();

    expect(records).toHaveLength(1);
    expect(records[0].endReason).toBe("no_humans");
    expect(records[0].players[0]).toMatchObject({ kind: "guest", finalStatus: "forfeited", finishPosition: 4 });
    // The three bots share the first place: there is no winner.
    expect(records[0].players.slice(1).map((player) => player.finishPosition)).toEqual([1, 1, 1]);
    expect(records[0].winnerSeat).toBeNull();
  });

  it("keeps playing while a human is still in the room", () => {
    const { service, transport, scheduler, join, start, host } = botRoom(["rule_based", "rule_based"]);
    const second = join(host.roomCode, "Second");
    expectOkAck(start(host.userId));

    // One human leaves; the other is still in the room, so the bots go on.
    expectOkAck(service.leaveRoom(second.userId, nextActionId()));
    expect(transport.to(host.userId, "game:ended")).toHaveLength(0);
    const before = transport.last(host.userId, "game:state").stateVersion;
    scheduler.advance(2_000);
    expect(transport.last(host.userId, "game:state").stateVersion).toBeGreaterThan(before);
  });
});
