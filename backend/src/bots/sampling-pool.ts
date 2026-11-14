// Runs the sampling bot's search in worker threads (docs/03 section 3), so a long search does not
// hold up the other rooms: the room service is synchronous and handles every room on one thread.
// The worker gets a plain copy of the bot's view and memory and a seed drawn from the bot's own
// generator, so the search uses only what the bot knows and never the match's generator.

import { existsSync } from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { LegalAction, PlayerMatchView } from "@wildhand/shared";
import { createSeededRng } from "../engine/rng.js";
import type { Logger } from "../logger.js";
import { BotMemory, type BotMemorySnapshot } from "./memory.js";
import { createSamplingBot } from "./sampling-bot.js";

export interface SamplingTask {
  view: PlayerMatchView;
  actions: LegalAction[];
  memory: BotMemorySnapshot;
  seed: number;
  budgetMs: number;
}

/** The search itself; runs inside a worker, and in tests on the calling thread. */
export function runSamplingTask(task: SamplingTask): LegalAction {
  const start = performance.now();
  return createSamplingBot().decide({
    view: task.view,
    memory: BotMemory.fromSnapshot(task.memory),
    actions: task.actions,
    rng: createSeededRng(task.seed),
    now: () => performance.now(),
    deadline: start + task.budgetMs
  });
}

interface Job {
  task: SamplingTask;
  resolve(action: LegalAction): void;
  reject(error: unknown): void;
}

interface PoolWorker {
  worker: Worker;
  job: Job | null;
}

/** Up to `size` workers, started on first use; tasks wait in a queue while every worker is busy. */
export class SamplingWorkerPool {
  private readonly workers: PoolWorker[] = [];
  private readonly queue: Job[] = [];
  private terminated = false;

  constructor(
    private readonly size: number,
    private readonly logger: Logger
  ) {}

  decide(task: SamplingTask): Promise<LegalAction> {
    if (this.terminated) {
      return Promise.reject(new Error("The sampling worker pool is terminated"));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.pump();
    });
  }

  async terminate(): Promise<void> {
    this.terminated = true;
    for (const job of this.queue.splice(0)) {
      job.reject(new Error("The sampling worker pool is terminated"));
    }
    await Promise.all(this.workers.splice(0).map((entry) => entry.worker.terminate()));
  }

  private pump(): void {
    while (this.queue.length > 0) {
      const free = this.workers.find((entry) => entry.job === null) ?? this.startWorker();
      if (!free) {
        return;
      }
      const job = this.queue.shift()!;
      free.job = job;
      // A busy worker keeps the process alive until it answers; an idle one does not.
      free.worker.ref();
      free.worker.postMessage(job.task);
    }
  }

  private startWorker(): PoolWorker | undefined {
    if (this.workers.length >= this.size) {
      return undefined;
    }

    const entry: PoolWorker = { worker: createWorker(), job: null };
    entry.worker.on("message", (action: LegalAction) => {
      const job = entry.job;
      entry.job = null;
      entry.worker.unref();
      job?.resolve(action);
      this.pump();
    });
    entry.worker.on("error", (error) => {
      this.logger.error("A sampling worker failed", error);
      entry.job?.reject(error);
      entry.job = null;
      this.workers.splice(this.workers.indexOf(entry), 1);
      this.pump();
    });
    this.workers.push(entry);
    return entry;
  }
}

/**
 * The built server runs `sampling-worker.js`; the development server and the tests run the
 * TypeScript source, which the worker loads through tsx.
 */
function createWorker(): Worker {
  const built = path.join(__dirname, "sampling-worker.js");
  if (existsSync(built)) {
    return new Worker(built);
  }
  const source = path.join(__dirname, "sampling-worker.ts");
  const usesTsx = process.execArgv.some((arg) => arg.includes("tsx"));
  return new Worker(source, { execArgv: usesTsx ? process.execArgv : [...process.execArgv, "--import", "tsx"] });
}
