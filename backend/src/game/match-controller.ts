// One running match in a room: wraps the engine with the seed, the turn timer (R22), and the
// distribution of effects, private events, and personal views (R25).

import { getMatchXp, type BotLevel, type ErrorCode, type Presence, type ServerToClientEvents } from "@wildhand/shared";
import { BotPlayer, createBot, type BotDecision } from "../bots/bot-player.js";
import type { SamplingWorkerPool } from "../bots/sampling-pool.js";
import {
  applyDraw,
  applyEndWithoutHumans,
  applyForfeit,
  applyPlay,
  applyTimeout,
  createMatch,
  createSeededRng,
  findPlayer,
  getMatchResults,
  setPresence,
  toMatchView,
  toPublicMatchView,
  type EngineResult,
  type MatchState,
  type PlayAction,
  type Rng,
  type ViewContext
} from "../engine/index.js";
import type { Logger } from "../logger.js";
import type { MatchRecord, PlayerKind } from "../persistence/match-result-store.js";
import type { Scheduler, TimerHandle } from "../scheduler.js";
import { BotDriver, type BotSettings } from "./bot-driver.js";
import type { Transport } from "./transport.js";

type ActionKind = "play" | "draw" | "timeout" | "forfeit" | "presence" | "end";

/** Actions that end the current turn, so the turn timer restarts even for the same player. */
const TURN_ENDING_ACTIONS: ReadonlySet<ActionKind> = new Set(["play", "draw", "timeout"]);

export interface MatchControllerOptions {
  matchId: string;
  seed: number;
  /** In seat order. */
  players: {
    userId: string;
    displayName: string;
    accountId: string | null;
    connected: boolean;
    /** Set for computer players, which are driven by the server and are always connected. */
    botLevel: BotLevel | null;
  }[];
  transport: Transport;
  scheduler: Scheduler;
  logger: Logger;
  turnTimeoutMs: number;
  bots: BotSettings;
  /** Where sampling bots search; without it, they search on the server thread. */
  samplingPool?: SamplingWorkerPool;
  /** Current room members, including bots; they receive every match message. */
  recipients: () => readonly string[];
  onEnded: () => void;
}

export type StartMatchResult = { ok: true; match: MatchController } | { ok: false; code: ErrorCode };

export class MatchController {
  private state: MatchState;
  private readonly rng: Rng;
  private readonly displayNames: Map<string, string>;
  private readonly accountIds: Map<string, string | null>;
  private readonly startedAt: number;
  private turnTimer: TimerHandle | null = null;
  private turnDeadline: number | null = null;
  private readonly bots = new Map<string, BotDriver>();

  static start(options: MatchControllerOptions): StartMatchResult {
    const rng = createSeededRng(options.seed);
    const created = createMatch(
      {
        matchId: options.matchId,
        userIds: options.players.map((player) => player.userId),
        disconnectedUserIds: options.players.filter((player) => !player.connected).map((player) => player.userId),
        botLevels: Object.fromEntries(
          options.players.flatMap((player) => (player.botLevel === null ? [] : [[player.userId, player.botLevel]]))
        )
      },
      rng
    );
    if (!created.ok) {
      return created;
    }

    const match = new MatchController(options, created.state, rng);
    match.restartTurnTimer();
    match.broadcastState();
    return { ok: true, match };
  }

  private constructor(
    private readonly options: MatchControllerOptions,
    state: MatchState,
    rng: Rng
  ) {
    this.state = state;
    this.rng = rng;
    this.displayNames = new Map(options.players.map((player) => [player.userId, player.displayName]));
    this.accountIds = new Map(options.players.map((player) => [player.userId, player.accountId]));
    this.startedAt = options.scheduler.now();

    for (const player of state.players) {
      if (player.botLevel !== null) {
        this.bots.set(player.userId, this.createBotDriver(player.userId, player.seat, player.botLevel));
      }
    }
  }

  get seed(): number {
    return this.options.seed;
  }

  get stateVersion(): number {
    return this.state.stateVersion;
  }

  get ended(): boolean {
    return this.state.phase === "ended";
  }

  /** The authoritative state; callers must not mutate it. */
  get snapshot(): MatchState {
    return this.state;
  }

  isActivePlayer(userId: string): boolean {
    return findPlayer(this.state, userId)?.matchStatus === "active";
  }

  includes(userId: string): boolean {
    return findPlayer(this.state, userId) !== undefined;
  }

  play(userId: string, action: PlayAction): ErrorCode | null {
    return this.apply("play", applyPlay(this.state, userId, action, this.rng));
  }

  draw(userId: string): ErrorCode | null {
    return this.apply("draw", applyDraw(this.state, userId, this.rng));
  }

  forfeit(userId: string): ErrorCode | null {
    return this.apply("forfeit", applyForfeit(this.state, userId, this.rng));
  }

  setPresence(userId: string, presence: Presence): ErrorCode | null {
    return this.apply("presence", setPresence(this.state, userId, presence));
  }

  /** R21: ends the match because no human player is left in it. */
  endWithoutHumans(): ErrorCode | null {
    return this.apply("end", applyEndWithoutHumans(this.state));
  }

  isBot(userId: string): boolean {
    return this.bots.has(userId);
  }

  /** Sends the current view to one user, for example after a reconnect. */
  sendSnapshot(userId: string): void {
    this.send(userId, "game:state", this.viewFor(userId));

    const results = getMatchResults(this.state);
    if (results) {
      this.send(userId, "game:ended", results);
    }
  }

  /**
   * The result to store (docs/03 section 2). A match that has not ended is recorded as `aborted`:
   * players keep only the positions they already have, and nobody earns XP.
   */
  toRecord(): MatchRecord {
    const results = getMatchResults(this.state);
    const standings = results?.standings ?? [];

    const players = this.state.players.map((player) => {
      const accountId = this.accountIds.get(player.userId) ?? null;
      const kind: PlayerKind = player.botLevel !== null ? "bot" : accountId === null ? "guest" : "registered";
      const standing = standings.find((entry) => entry.userId === player.userId);
      return {
        seat: player.seat,
        kind,
        accountId,
        botLevel: player.botLevel,
        displayName: this.displayNames.get(player.userId) ?? player.userId,
        finalStatus: player.matchStatus,
        finishPosition: player.finishPosition,
        xpEarned: kind === "registered" && standing ? getMatchXp(standing, standings) : 0
      };
    });

    // The winner is the player alone in first place, even if the match was aborted later. A blocked
    // game before anyone finished gives several players the shared first place (R18): no winner.
    const firstPlace = this.state.players.filter((player) => player.finishPosition === 1);
    const winner = firstPlace.length === 1 ? firstPlace[0] : undefined;

    return {
      seed: this.options.seed,
      turnTimeoutMs: this.options.turnTimeoutMs,
      startedAt: new Date(this.startedAt),
      endedAt: new Date(this.options.scheduler.now()),
      endReason: results?.endReason ?? "aborted",
      winnerSeat: winner?.seat ?? null,
      players
    };
  }

  dispose(): void {
    this.clearTurnTimer();
    for (const driver of this.bots.values()) {
      driver.dispose();
    }
  }

  private apply(kind: ActionKind, result: EngineResult): ErrorCode | null {
    if (!result.ok) {
      return result.code;
    }

    if (result.state === this.state) {
      return null;
    }

    const previous = this.state;
    this.state = result.state;

    if (this.ended) {
      this.clearTurnTimer();
    } else if (TURN_ENDING_ACTIONS.has(kind) || previous.currentPlayerId !== this.state.currentPlayerId) {
      this.restartTurnTimer();
    }

    const { recipients } = this.options;
    for (const effect of result.effects) {
      for (const userId of recipients()) {
        this.send(userId, "game:effect", effect);
      }
    }

    for (const event of result.privateEvents) {
      if (event.type === "spyReveal") {
        this.send(event.userId, "game:spyReveal", event.reveal);
      } else {
        this.send(event.userId, "game:swapResult", event.result);
      }
    }

    this.broadcastState();

    const results = getMatchResults(this.state);
    if (results) {
      for (const driver of this.bots.values()) {
        driver.dispose();
      }
      for (const userId of recipients()) {
        this.send(userId, "game:ended", results);
      }
      this.options.onEnded();
    }

    return null;
  }

  private broadcastState(): void {
    // The public part is the same for everyone; only the viewer's own hand differs (R25).
    const context = this.viewContext();
    const publicView = toPublicMatchView(this.state, context);
    for (const userId of this.options.recipients()) {
      this.send(userId, "game:state", toMatchView(this.state, userId, context, publicView));
    }
  }

  /** Messages to bots go to their drivers, everything else to the transport. */
  private send<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    const driver = this.bots.get(userId);
    if (driver) {
      driver.receive(event, args[0]);
    } else {
      this.options.transport.send(userId, event, ...args);
    }
  }

  private createBotDriver(userId: string, seat: number, level: BotLevel): BotDriver {
    const { seed, scheduler, logger, bots } = this.options;
    // Each bot has its own generators derived from the match seed, so bots never consume the
    // match's random numbers and a match stays reproducible from its seed and its actions.
    const botSeed = (seed ^ Math.imul(seat + 1, 0x9e3779b1)) >>> 0;
    return new BotDriver({
      player: new BotPlayer({ userId, bot: createBot(level), rng: createSeededRng(botSeed), budgetMs: bots.samplingBudgetMs }),
      scheduler,
      logger,
      thinkDelay: bots.thinkDelay,
      delayRng: createSeededRng(botSeed ^ 0x5bd1e995),
      submit: (decision, stateVersion) => this.botAct(userId, decision, stateVersion),
      samplingPool: this.options.samplingPool
    });
  }

  private botAct(userId: string, decision: BotDecision, stateVersion: number): ErrorCode | null {
    if (stateVersion !== this.state.stateVersion) {
      return "stale_state";
    }
    return decision.type === "draw" ? this.draw(userId) : this.play(userId, decision.action);
  }

  private viewFor(userId: string) {
    return toMatchView(this.state, userId, this.viewContext());
  }

  private viewContext(): ViewContext {
    return {
      displayName: (playerId) => this.displayNames.get(playerId) ?? playerId,
      turnDeadline: this.turnDeadline,
      serverTime: this.options.scheduler.now()
    };
  }

  /** R22: every turn has a time limit; no timer runs while no one has the turn. */
  private restartTurnTimer(): void {
    this.clearTurnTimer();

    const currentPlayerId = this.state.currentPlayerId;
    if (currentPlayerId === null) {
      return;
    }

    const { scheduler, turnTimeoutMs } = this.options;
    this.turnDeadline = scheduler.now() + turnTimeoutMs;
    this.turnTimer = scheduler.setTimeout(() => {
      this.turnTimer = null;
      const code = this.apply("timeout", applyTimeout(this.state, currentPlayerId, this.rng));
      if (code !== null) {
        // A rejected timeout must not leave the turn without a deadline.
        this.options.logger.error(`Turn timeout of ${currentPlayerId} in match ${this.options.matchId} was rejected: ${code}`);
        if (!this.ended) {
          this.restartTurnTimer();
          this.broadcastState();
        }
      }
    }, turnTimeoutMs);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer !== null) {
      this.options.scheduler.clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnDeadline = null;
  }
}
