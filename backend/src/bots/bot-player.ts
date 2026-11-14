// A computer player as seen from the outside: it receives the same server messages as a human
// client and answers with a `game:play` selection or a `game:draw`. Used by the live matches
// (BotDriver) and by the headless simulator.

import {
  getLegalActions,
  type BotLevel,
  type LegalAction,
  type PlayerMatchView,
  type ServerToClientEvents
} from "@wildhand/shared";
import type { Rng } from "../engine/rng.js";
import type { PlayAction } from "../engine/state.js";
import { createHeuristicBot, LEVEL_3_WEIGHTS } from "./heuristic-bot.js";
import { BotMemory } from "./memory.js";
import { randomBot } from "./random-bot.js";
import { ruleBasedBot } from "./rule-based-bot.js";
import { createSamplingBot } from "./sampling-bot.js";
import type { SamplingWorkerPool } from "./sampling-pool.js";
import { toPlayAction } from "./simulation.js";
import type { Bot } from "./types.js";

export type BotDecision = { type: "play"; action: PlayAction } | { type: "draw" };

export function createBot(level: BotLevel): Bot {
  switch (level) {
    case "random":
      return randomBot;
    case "rule_based":
      return ruleBasedBot;
    case "heuristic":
      return createHeuristicBot(LEVEL_3_WEIGHTS);
    case "sampling":
      return createSamplingBot();
  }
}

export interface BotPlayerOptions {
  userId: string;
  bot: Bot;
  rng: Rng;
  /** Milliseconds; `performance.now` by default. */
  clock?: () => number;
  /** Thinking time of one decision, used by the sampling bot. */
  budgetMs: number;
}

export class BotPlayer {
  readonly memory: BotMemory;
  private readonly clock: () => number;

  constructor(private readonly options: BotPlayerOptions) {
    this.memory = new BotMemory(options.userId);
    this.clock = options.clock ?? (() => performance.now());
  }

  get userId(): string {
    return this.options.userId;
  }

  get level(): BotLevel {
    return this.options.bot.level;
  }

  /** Feeds a server message to the bot's memory. */
  observe<E extends keyof ServerToClientEvents>(event: E, payload: Parameters<ServerToClientEvents[E]>[0]): void {
    switch (event) {
      case "game:state": {
        const view = payload as Parameters<ServerToClientEvents["game:state"]>[0];
        if (view.viewer === "player") {
          this.memory.observeState(view);
        }
        break;
      }
      case "game:effect":
        this.memory.observeEffect(payload as Parameters<ServerToClientEvents["game:effect"]>[0]);
        break;
      case "game:spyReveal":
        this.memory.observeSpy(payload as Parameters<ServerToClientEvents["game:spyReveal"]>[0]);
        break;
      case "game:swapResult":
        this.memory.observeSwap(payload as Parameters<ServerToClientEvents["game:swapResult"]>[0]);
        break;
    }
  }

  /** The latest view when it is the bot's turn, otherwise `null`. */
  get turnView(): PlayerMatchView | null {
    const view = this.memory.view;
    if (!view || view.phase !== "awaiting_action" || view.currentPlayerId !== this.userId) {
      return null;
    }
    return view;
  }

  /** Decides on the latest view; `null` when it is not the bot's turn. */
  decide(): BotDecision | null {
    const turn = this.turn();
    if (!turn) {
      return null;
    }

    const { bot, rng, budgetMs } = this.options;
    const start = this.clock();
    const action = bot.decide({
      view: turn.view,
      memory: this.memory,
      actions: turn.actions,
      rng,
      now: this.clock,
      deadline: start + budgetMs
    });
    return this.toDecision(turn.view, action);
  }

  /**
   * Like `decide`, but the sampling bot's search runs in a worker thread of `pool`. The worker gets
   * a seed from the bot's own generator.
   */
  async decideInWorker(pool: SamplingWorkerPool): Promise<BotDecision | null> {
    const turn = this.turn();
    if (!turn) {
      return null;
    }

    const action = await pool.decide({
      view: turn.view,
      actions: turn.actions,
      memory: this.memory.toSnapshot(),
      seed: this.options.rng.nextInt(0, 2 ** 31 - 1),
      budgetMs: this.options.budgetMs
    });
    return this.toDecision(turn.view, action);
  }

  private turn(): { view: PlayerMatchView; actions: LegalAction[] } | null {
    const view = this.turnView;
    const actions = view ? getLegalActions(view) : [];
    return view && actions.length > 0 ? { view, actions } : null;
  }

  private toDecision(view: PlayerMatchView, action: LegalAction): BotDecision {
    if (action.type === "draw") {
      return { type: "draw" };
    }
    const target = view.players.find((player) => player.userId === action.targetPlayerId);
    return { type: "play", action: toPlayAction(action, target?.handSize ?? 0, this.options.rng) };
  }
}
