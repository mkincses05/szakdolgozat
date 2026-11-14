// Runs a whole match of computer players without Socket.IO, timers, or a database (docs/03
// section 4). Messages reach the bots exactly as in a live match: every public effect and view to
// everyone, Spy and Swap results only to the players involved. Used by the tests and the simulator.

import type { BotLevel, GameEffect, MatchResults } from "@wildhand/shared";
import { applyDraw, applyPlay } from "../engine/actions.js";
import { createSeededRng } from "../engine/rng.js";
import { createMatch } from "../engine/setup.js";
import type { EngineResult, MatchState } from "../engine/state.js";
import { getMatchResults } from "../engine/turn.js";
import { toMatchView, toPublicMatchView, type ViewContext } from "../engine/views.js";
import { BotPlayer, createBot } from "./bot-player.js";
import type { Bot } from "./types.js";

export interface HeadlessMatchOptions {
  seed: number;
  /** One entry per seat. */
  levels: readonly BotLevel[];
  /** Thinking time of one sampling-bot decision. */
  budgetMs: number;
  /** Replaces the bot of a level, for example to try other heuristic weights. */
  botFactory?: (level: BotLevel, seat: number) => Bot;
  maxActions?: number;
  /** Called before each decision with the authoritative state, for test assertions only. */
  inspect?: (state: MatchState, player: BotPlayer) => void;
}

export interface DecisionRecord {
  seat: number;
  level: BotLevel;
  durationMs: number;
}

export interface HeadlessMatchResult {
  results: MatchResults | null;
  /** User IDs `s0`, `s1`, ... in seat order. */
  userIds: string[];
  actions: number;
  rejected: number;
  decisions: DecisionRecord[];
  effects: GameEffect[];
  final: MatchState;
}

const DEFAULT_MAX_ACTIONS = 20_000;
const VIEW_CONTEXT: ViewContext = { displayName: (userId) => userId, turnDeadline: null, serverTime: 0 };

export function runHeadlessMatch(options: HeadlessMatchOptions): HeadlessMatchResult {
  const { seed, levels, budgetMs, botFactory = createBot, maxActions = DEFAULT_MAX_ACTIONS, inspect } = options;
  const userIds = levels.map((_level, seat) => `s${seat}`);
  const matchRng = createSeededRng(seed);
  const created = createMatch(
    {
      matchId: `headless-${seed}`,
      userIds,
      botLevels: Object.fromEntries(userIds.map((userId, seat) => [userId, levels[seat]]))
    },
    matchRng
  );
  if (!created.ok) {
    throw new Error(`Cannot create the match: ${created.code}`);
  }

  const players = userIds.map(
    (userId, seat) =>
      new BotPlayer({
        userId,
        bot: botFactory(levels[seat], seat),
        rng: createSeededRng((seed ^ Math.imul(seat + 1, 0x9e3779b1)) >>> 0),
        budgetMs
      })
  );

  let state = created.state;
  const effects: GameEffect[] = [];
  const decisions: DecisionRecord[] = [];
  let actions = 0;
  let rejected = 0;

  const deliverState = () => {
    const publicView = toPublicMatchView(state, VIEW_CONTEXT);
    for (const player of players) {
      player.observe("game:state", toMatchView(state, player.userId, VIEW_CONTEXT, publicView));
    }
  };

  const deliver = (result: Extract<EngineResult, { ok: true }>) => {
    for (const effect of result.effects) {
      effects.push(effect);
      for (const player of players) {
        player.observe("game:effect", effect);
      }
    }
    for (const event of result.privateEvents) {
      const player = players.find((candidate) => candidate.userId === event.userId)!;
      if (event.type === "spyReveal") {
        player.observe("game:spyReveal", event.reveal);
      } else {
        player.observe("game:swapResult", event.result);
      }
    }
    state = result.state;
    deliverState();
  };

  deliverState();
  while (state.phase === "awaiting_action" && state.currentPlayerId !== null && actions < maxActions) {
    const seat = userIds.indexOf(state.currentPlayerId);
    const player = players[seat];
    inspect?.(state, player);

    const start = performance.now();
    const decision = player.decide();
    decisions.push({ seat, level: levels[seat], durationMs: performance.now() - start });
    if (!decision) {
      throw new Error(`Bot ${player.userId} did not decide on its turn`);
    }

    const result =
      decision.type === "draw"
        ? applyDraw(state, player.userId, matchRng)
        : applyPlay(state, player.userId, decision.action, matchRng);
    actions++;

    if (!result.ok) {
      rejected++;
      // Like a turn timeout: the server would draw for the player.
      const fallback = applyDraw(state, player.userId, matchRng);
      if (!fallback.ok) {
        throw new Error(`Bot ${player.userId} is stuck: ${result.code}, then ${fallback.code}`);
      }
      deliver(fallback);
      continue;
    }
    deliver(result);
  }

  return { results: getMatchResults(state), userIds, actions, rejected, decisions, effects, final: state };
}
