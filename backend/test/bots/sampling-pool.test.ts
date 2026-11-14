// The sampling bot's search in worker threads (docs/03 section 3).

import { afterEach, describe, expect, it } from "vitest";
import { getLegalActions, type PlayerMatchView } from "@wildhand/shared";
import { BotMemory } from "../../src/bots/memory.js";
import { runSamplingTask, SamplingWorkerPool, type SamplingTask } from "../../src/bots/sampling-pool.js";
import { toMatchView } from "../../src/engine/views.js";
import { buildState, num, plus2, spy } from "../engine/helpers.js";
import { silentLogger } from "../game/helpers.js";
import { expectOkAck, nextActionId, setup } from "../game/helpers.js";

function task(): SamplingTask {
  const state = buildState({
    hands: [[num("red", 1), num("blue", 1), plus2("green"), spy()], [num("yellow", 7), num("green", 3)], [num("blue", 9)]],
    top: num("red", 5)
  });
  const view = toMatchView(state, "p0", { displayName: (id) => id, turnDeadline: null, serverTime: 0 }) as PlayerMatchView;
  const memory = new BotMemory("p0");
  memory.observeState(view);
  memory.observeSpy({ targetPlayerId: "p2", hand: state.players[2].hand });
  return { view, actions: getLegalActions(view), memory: memory.toSnapshot(), seed: 7, budgetMs: 20 };
}

const pools: SamplingWorkerPool[] = [];
afterEach(async () => {
  await Promise.all(pools.splice(0).map((pool) => pool.terminate()));
});

describe("sampling worker pool", () => {
  it("rebuilds the bot memory from a snapshot", () => {
    const original = task();
    const memory = BotMemory.fromSnapshot(original.memory);
    expect(memory.toSnapshot()).toEqual(original.memory);
    expect(memory.knownCards("p2")).toHaveLength(1);
  });

  it("chooses one of the legal actions on the calling thread and in a worker", async () => {
    const input = task();
    expect(input.actions).toContainEqual(runSamplingTask(input));

    const pool = new SamplingWorkerPool(1, silentLogger);
    pools.push(pool);
    const [first, second] = await Promise.all([pool.decide(input), pool.decide(task())]);
    expect(input.actions).toContainEqual(first);
    expect(task().actions.length).toBeGreaterThan(0);
    expect(second.type === "draw" || second.type === "play").toBe(true);
  }, 30_000);

  it("rejects tasks after it was terminated", async () => {
    const pool = new SamplingWorkerPool(1, silentLogger);
    await pool.terminate();
    await expect(pool.decide(task())).rejects.toThrow("terminated");
  });

  it("lets a sampling bot play a live match through the pool, without blocking the room", async () => {
    // A pool that answers on a later turn of the event loop, like a worker.
    const fakePool = {
      decide: (input: SamplingTask) => new Promise((resolve) => setImmediate(() => resolve(runSamplingTask(input))))
    } as unknown as SamplingWorkerPool;
    const { service, transport, scheduler, create, start } = setup(3, {
      bots: { thinkDelay: { minMs: 10, maxMs: 10 }, samplingBudgetMs: 1, samplingWorkers: 1 },
      samplingPool: fakePool
    });
    const host = create("Host");
    expectOkAck(service.addBot(host.userId, nextActionId(), "sampling"));
    expectOkAck(start(host.userId));

    // The human never acts: the turn timer draws for them (R22).
    for (let step = 0; step < 20_000 && transport.to(host.userId, "game:ended").length === 0; step++) {
      scheduler.advance(50);
      await new Promise((resolve) => setImmediate(resolve));
    }
    expect(transport.last(host.userId, "game:ended").standings).toHaveLength(2);
  }, 60_000);
});
