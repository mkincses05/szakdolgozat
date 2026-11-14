// Runs one computer player in a live match. The driver receives the bot's messages instead of a
// socket, waits a short thinking time on the bot's turn so humans can follow the game, and then
// sends the decision through the same match actions a human uses. A decision made for an older
// state version is dropped; the turn timer still applies to bots (R22). With a worker pool, the
// sampling bot searches in a worker thread, so other rooms are not held up meanwhile.

import type { ErrorCode, ServerToClientEvents } from "@wildhand/shared";
import type { BotDecision, BotPlayer } from "../bots/bot-player.js";
import type { SamplingWorkerPool } from "../bots/sampling-pool.js";
import type { Rng } from "../engine/rng.js";
import type { Logger } from "../logger.js";
import type { Scheduler, TimerHandle } from "../scheduler.js";

export interface ThinkDelay {
  minMs: number;
  maxMs: number;
}

export interface BotSettings {
  thinkDelay: ThinkDelay;
  /** Thinking time of one sampling-bot decision. */
  samplingBudgetMs: number;
  /** Worker threads for sampling-bot searches; 0 searches on the server thread. */
  samplingWorkers: number;
}

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  thinkDelay: { minMs: 700, maxMs: 1_400 },
  samplingBudgetMs: 400,
  samplingWorkers: 2
};

export interface BotDriverOptions {
  player: BotPlayer;
  scheduler: Scheduler;
  logger: Logger;
  thinkDelay: ThinkDelay;
  /** Draws the thinking time; separate from the bot's decision generator. */
  delayRng: Rng;
  /** Applies a decision if the match is still at `stateVersion`. */
  submit(decision: BotDecision, stateVersion: number): ErrorCode | null;
  /** Where the sampling bot searches; without it, the search runs on the calling thread. */
  samplingPool?: SamplingWorkerPool;
}

export class BotDriver {
  private timer: TimerHandle | null = null;
  private scheduledVersion: number | null = null;
  private disposed = false;

  constructor(private readonly options: BotDriverOptions) {}

  receive<E extends keyof ServerToClientEvents>(event: E, payload: Parameters<ServerToClientEvents[E]>[0]): void {
    this.options.player.observe(event, payload);
    if (event === "game:state") {
      this.schedule();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
  }

  private schedule(): void {
    const view = this.options.player.turnView;
    if (!view) {
      this.cancel();
      return;
    }
    // A repeated view of the same version, for example after a presence change, keeps the timer.
    if (this.scheduledVersion === view.stateVersion) {
      return;
    }

    this.cancel();
    const { scheduler, thinkDelay, delayRng } = this.options;
    const delay = delayRng.nextInt(thinkDelay.minMs, Math.max(thinkDelay.minMs, thinkDelay.maxMs));
    this.scheduledVersion = view.stateVersion;
    this.timer = scheduler.setTimeout(() => {
      this.timer = null;
      this.scheduledVersion = null;
      this.act(view.stateVersion);
    }, delay);
  }

  private act(stateVersion: number): void {
    const { player, logger, samplingPool } = this.options;
    const view = player.turnView;
    if (!view || view.stateVersion !== stateVersion) {
      return;
    }

    if (samplingPool && player.level === "sampling") {
      player
        .decideInWorker(samplingPool)
        .then((decision) => this.submit(decision, stateVersion))
        .catch((error: unknown) => {
          // The turn timer ends the bot's turn.
          if (!this.disposed) {
            logger.error(`Bot ${player.userId} could not decide in a worker`, error);
          }
        });
      return;
    }

    this.submit(player.decide(), stateVersion);
  }

  private submit(decision: BotDecision | null, stateVersion: number): void {
    const { player, logger } = this.options;
    // The match may have ended or moved on while a worker was searching.
    if (this.disposed || !decision || player.turnView?.stateVersion !== stateVersion) {
      return;
    }

    const code = this.options.submit(decision, stateVersion);
    if (code !== null) {
      // Never expected; the turn timer ends the bot's turn anyway.
      logger.error(`Bot ${player.userId} (${player.level}) action was rejected: ${code}`);
    }
  }

  private cancel(): void {
    if (this.timer !== null) {
      this.options.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
    this.scheduledVersion = null;
  }
}
