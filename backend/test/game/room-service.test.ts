import { describe, expect, it } from "vitest";
import type { MatchView, PlayerMatchView } from "@wildhand/shared";
import {
  RECONNECT_GRACE_MS,
  TURN_TIMEOUT_MS,
  expectOkAck,
  nextActionId,
  setup,
  startedRoom
} from "./helpers.js";

function asPlayerView(view: MatchView): PlayerMatchView {
  expect(view.viewer).toBe("player");
  return view as PlayerMatchView;
}

describe("lobby", () => {
  it("creates a room with the creator as host", () => {
    const { create, transport } = setup();
    const host = create("Anna");

    expect(host).toEqual({ userId: "u1", roomCode: "ROOM01", reconnectToken: "token-1" });
    expect(transport.last("u1", "room:state")).toEqual({
      code: "ROOM01",
      state: "lobby",
      hostUserId: "u1",
      members: [{ userId: "u1", displayName: "Anna", presence: "connected" }],
      minPlayers: 2,
      maxPlayers: 8
    });
  });

  it("lets players join in order and informs every member", () => {
    const { create, join, transport } = setup();
    const host = create("Anna");
    join(host.roomCode, "Bence");

    for (const userId of ["u1", "u2"]) {
      expect(transport.last(userId, "room:state").members.map((member) => member.displayName)).toEqual([
        "Anna",
        "Bence"
      ]);
    }
  });

  it("rejects unknown rooms, full rooms (R1), and users already in a room", () => {
    const { service, create, join } = setup();
    const host = create();
    for (let index = 2; index <= 8; index++) join(host.roomCode, `P${index}`);

    expect(service.joinRoom(null, "NOPE00", "X", () => {})).toEqual({ ok: false, code: "room_not_found" });
    expect(service.joinRoom(null, host.roomCode, "Ninth", () => {})).toEqual({ ok: false, code: "room_full" });
    expect(service.createRoom(host.userId, "Again", () => {})).toEqual({ ok: false, code: "already_in_room" });
  });

  it("transfers the host to the longest-present member when the host leaves (R24)", () => {
    const { service, create, join, transport } = setup();
    const host = create();
    const second = join(host.roomCode, "Second");
    join(host.roomCode, "Third");

    expectOkAck(service.leaveRoom(host.userId, nextActionId()));

    expect(transport.last(second.userId, "room:state")).toMatchObject({
      hostUserId: second.userId,
      members: [{ userId: second.userId }, { userId: "u3" }]
    });
  });

  it("closes the room when the last member leaves", () => {
    const { service, create } = setup();
    const host = create();
    expectOkAck(service.leaveRoom(host.userId, nextActionId()));
    expect(service.joinRoom(null, host.roomCode, "Late", () => {})).toEqual({ ok: false, code: "room_not_found" });
  });

  it("removes a lobby member whose grace period expires", () => {
    const { service, create, join, transport, scheduler } = setup();
    const host = create();
    const guest = join(host.roomCode, "Guest");

    service.disconnect(guest.userId);
    expect(transport.last(host.userId, "room:state").members[1].presence).toBe("disconnected");

    scheduler.advance(RECONNECT_GRACE_MS);
    expect(transport.last(host.userId, "room:state").members).toHaveLength(1);
  });
});

describe("starting a match", () => {
  it("is host-only and needs at least 2 members (R1, R24)", () => {
    const { create, join, start } = setup();
    const host = create();
    expect(start(host.userId)).toEqual({ ok: false, code: "not_enough_players" });

    const guest = join(host.roomCode, "Guest");
    expect(start(guest.userId)).toEqual({ ok: false, code: "not_host" });
    expect(start(host.userId)).toEqual({ ok: true });
  });

  it("sends each player a personal view with their own hand only (R25)", () => {
    const { members, transport, service } = startedRoom(3);

    const views = members.map((member) => asPlayerView(transport.last(member.userId, "game:state")));
    for (const [index, view] of views.entries()) {
      expect(view.userId).toBe(members[index].userId);
      expect(view.hand).toHaveLength(7);
      expect(view.players.map((player) => player.handSize)).toEqual([7, 7, 7]);
      expect(view.players.map((player) => player.displayName)).toEqual(["Player 1", "Player 2", "Player 3"]);
      expect(view.turnDeadline).toBe(TURN_TIMEOUT_MS);
      // The fake clock starts at 0, so the server time is sent alongside the deadline.
      expect(view.serverTime).toBe(0);
    }

    // No message to a user contains a card of another player's hand.
    for (const [index, member] of members.entries()) {
      const othersCards = views.filter((_, other) => other !== index).flatMap((view) => view.hand.map((card) => card.id));
      const received = JSON.stringify(transport.messages.filter((message) => message.userId === member.userId));
      for (const cardId of othersCards) {
        expect(received).not.toContain(`"${cardId}"`);
      }
    }

    expect(service.joinRoom(null, members[0].roomCode, "Late", () => {})).toEqual({
      ok: false,
      code: "room_in_match"
    });
  });
});

describe("gameplay actions", () => {
  it("processes a draw, advances the turn, and keeps clients in sync", () => {
    const { members, currentPlayerId, drawFor, transport } = startedRoom(2);
    const other = members.find((member) => member.userId !== currentPlayerId)!;

    expect(drawFor(currentPlayerId)).toEqual({ ok: true });

    const actorView = asPlayerView(transport.last(currentPlayerId, "game:state"));
    const otherView = transport.last(other.userId, "game:state");
    expect(actorView.hand).toHaveLength(8);
    expect(actorView.stateVersion).toBe(otherView.stateVersion);
    expect(otherView.currentPlayerId).toBe(other.userId);
    expect(transport.last(other.userId, "game:effect")).toEqual({
      type: "cardDrawn",
      draw: { userId: currentPlayerId, requested: 1, actual: 1 }
    });
  });

  it("answers a duplicate action with the original acknowledgement without changing the state", () => {
    const { currentPlayerId, service, transport } = startedRoom(2);
    const stateVersion = transport.last(currentPlayerId, "game:state").stateVersion;
    const payload = { actionId: nextActionId(), stateVersion };

    expect(service.draw(currentPlayerId, payload)).toEqual({ ok: true });
    const messageCount = transport.messages.length;

    expect(service.draw(currentPlayerId, payload)).toEqual({ ok: true });
    expect(transport.messages).toHaveLength(messageCount);
  });

  it("accepts an action sent before another player's connection changed", () => {
    const { members, currentPlayerId, service, transport } = startedRoom(3);
    const stateVersion = transport.last(currentPlayerId, "game:state").stateVersion;
    const other = members.find((member) => member.userId !== currentPlayerId)!;

    service.disconnect(other.userId);
    const view = transport.last(currentPlayerId, "game:state");
    expect(view.players.find((player) => player.userId === other.userId)?.presence).toBe("disconnected");

    expect(service.draw(currentPlayerId, { actionId: nextActionId(), stateVersion })).toEqual({ ok: true });
  });

  it("rejects a stale state version", () => {
    const { currentPlayerId, service } = startedRoom(2);
    expect(service.draw(currentPlayerId, { actionId: nextActionId(), stateVersion: 99 })).toEqual({
      ok: false,
      code: "stale_state"
    });
  });

  it("rejects actions of the player who is not on turn and of users without a session", () => {
    const { members, currentPlayerId, drawFor, service } = startedRoom(2);
    const other = members.find((member) => member.userId !== currentPlayerId)!;
    expect(drawFor(other.userId)).toEqual({ ok: false, code: "not_your_turn" });
    expect(service.draw("nobody", { actionId: nextActionId(), stateVersion: 0 })).toEqual({
      ok: false,
      code: "not_in_room"
    });
  });

  it("sends the Spy snapshot only to the Spy player (R14, R25)", () => {
    for (let seed = 0; seed < 500; seed++) {
      const room = startedRoom(3, seed);
      const view = asPlayerView(room.transport.last(room.currentPlayerId, "game:state"));
      const spyCard = view.hand.find((card) => card.kind === "spy");
      if (!spyCard) continue;

      const target = room.members.find((member) => member.userId !== room.currentPlayerId)!;
      const ack = room.service.play(room.currentPlayerId, {
        actionId: nextActionId(),
        stateVersion: view.stateVersion,
        cardIds: [spyCard.id],
        targetPlayerId: target.userId
      });
      expect(ack).toEqual({ ok: true });

      const reveals = room.transport.messages.filter((message) => message.event === "game:spyReveal");
      expect(reveals).toHaveLength(1);
      expect(reveals[0].userId).toBe(room.currentPlayerId);
      return;
    }
    expect.fail("no seed dealt a Spy card to the first player");
  });
});

describe("turn timer (R22)", () => {
  it("draws for the player on timeout and restarts the timer for the next turn", () => {
    const { members, currentPlayerId, scheduler, transport } = startedRoom(2);
    const other = members.find((member) => member.userId !== currentPlayerId)!;

    scheduler.advance(TURN_TIMEOUT_MS);

    expect(asPlayerView(transport.last(currentPlayerId, "game:state")).hand).toHaveLength(8);
    const view = transport.last(other.userId, "game:state");
    expect(view.currentPlayerId).toBe(other.userId);
    expect(view.turnDeadline).toBe(2 * TURN_TIMEOUT_MS);

    scheduler.advance(TURN_TIMEOUT_MS);
    expect(transport.last(other.userId, "game:state").currentPlayerId).toBe(currentPlayerId);
  });

  it("a player who disconnects keeps their turn until the timer expires (R23)", () => {
    const { members, currentPlayerId, scheduler, service, transport } = startedRoom(3);
    const observer = members.find((member) => member.userId !== currentPlayerId)!;

    service.disconnect(currentPlayerId);
    expect(transport.last(observer.userId, "game:state").currentPlayerId).toBe(currentPlayerId);

    scheduler.advance(TURN_TIMEOUT_MS);
    expect(transport.last(observer.userId, "game:state").currentPlayerId).not.toBe(currentPlayerId);
  });
});

describe("disconnect and forfeit (R23)", () => {
  it("forfeits a player whose grace period expires and ends a 2-player match", () => {
    const { members, scheduler, service, transport, resume } = startedRoom(2);
    const [first, second] = members;

    service.disconnect(second.userId);
    scheduler.advance(RECONNECT_GRACE_MS);

    expect(transport.last(first.userId, "game:ended")).toMatchObject({
      endReason: "forfeits",
      winnerId: first.userId,
      standings: [
        { userId: first.userId, position: 1 },
        { userId: second.userId, position: 2, matchStatus: "forfeited" }
      ]
    });
    expect(transport.last(first.userId, "room:state")).toMatchObject({ state: "lobby", members: [{ userId: first.userId }] });
    expect(resume(second.reconnectToken)).toEqual({ ok: false, code: "session_expired" });
    expect(resume("unknown")).toEqual({ ok: false, code: "invalid_reconnect_token" });
  });

  it("a reconnect within the grace period prevents the forfeit and resends the state", () => {
    const { members, scheduler, service, transport, resume } = startedRoom(2);
    const second = members[1];

    service.disconnect(second.userId);
    scheduler.advance(RECONNECT_GRACE_MS - 1);
    transport.clear();

    expect(expectOkAck(resume(second.reconnectToken))).toEqual(second);
    const view = asPlayerView(transport.last(second.userId, "game:state"));
    expect(view.players.find((player) => player.userId === second.userId)?.presence).toBe("connected");

    scheduler.advance(RECONNECT_GRACE_MS);
    expect(transport.to(members[0].userId, "game:ended")).toHaveLength(0);
  });

  it("a leaving host forfeits, the match continues, and the host is transferred (R24)", () => {
    const { members, service, transport } = startedRoom(3);
    const [host, second, third] = members;

    expectOkAck(service.leaveRoom(host.userId, nextActionId()));

    expect(transport.last(second.userId, "room:state")).toMatchObject({ state: "in_match", hostUserId: second.userId });
    const view = transport.last(third.userId, "game:state");
    expect(view.phase).toBe("awaiting_action");
    expect(view.players[0]).toMatchObject({ matchStatus: "forfeited", presence: "left", handSize: 0 });
  });
});

describe("after the match", () => {
  it("returns the room to the lobby so the host can start a new match", () => {
    const { members, service, join, start, transport } = startedRoom(2);
    const [host, second] = members;

    expectOkAck(service.leaveRoom(second.userId, nextActionId()));
    expect(transport.last(host.userId, "game:ended").winnerId).toBe(host.userId);
    expect(transport.last(host.userId, "room:state").state).toBe("lobby");
    expect(start(host.userId)).toEqual({ ok: false, code: "not_enough_players" });

    const newcomer = join(host.roomCode, "Newcomer");
    expect(start(host.userId)).toEqual({ ok: true });
    expect(asPlayerView(transport.last(newcomer.userId, "game:state")).hand).toHaveLength(7);
  });

  it("resends the ended match and its results to a member who reconnects", () => {
    const { members, scheduler, service, transport, resume } = startedRoom(3);
    const [first, second, third] = members;

    service.disconnect(first.userId);
    expectOkAck(service.leaveRoom(second.userId, nextActionId()));
    expectOkAck(service.leaveRoom(third.userId, nextActionId()));
    scheduler.advance(1);
    transport.clear();

    expectOkAck(resume(first.reconnectToken));
    expect(transport.last(first.userId, "game:state").phase).toBe("ended");
    expect(transport.last(first.userId, "game:ended").winnerId).toBe(first.userId);
  });
});
