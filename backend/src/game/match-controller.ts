// One running match in a room: wraps the engine with the seed, the turn timer (R22), and the
// distribution of effects, private events, and personal views (R25).

import { getMatchXp, type ErrorCode, type Presence } from "@wildhand/shared";
import {
  applyDraw,
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
import type { Transport } from "./transport.js";

type ActionKind = "play" | "draw" | "timeout" | "forfeit" | "presence";

/** Actions that end the current turn, so the turn timer restarts even for the same player. */
const TURN_ENDING_ACTIONS: ReadonlySet<ActionKind> = new Set(["play", "draw", "timeout"]);

export interface MatchControllerOptions {
  matchId: string;
  seed: number;
  /** In seat order. */
  players: { userId: string; displayName: string; connected: boolean }[];
  transport: Transport;
  scheduler: Scheduler;
  logger: Logger;
  turnTimeoutMs: number;
  /** Current room members; they receive every match message. */
  recipients: () => readonly string[];
  onEnded: () => void;
}

export type StartMatchResult = { ok: true; match: MatchController } | { ok: false; code: ErrorCode };

export class MatchController {
  private state: MatchState;
  private readonly rng: Rng;
  private readonly displayNames: Map<string, string>;
  private readonly startedAt: number;
  private turnTimer: TimerHandle | null = null;
  private turnDeadline: number | null = null;

  static start(options: MatchControllerOptions): StartMatchResult {
    const rng = createSeededRng(options.seed);
    const created = createMatch(
      {
        matchId: options.matchId,
        userIds: options.players.map((player) => player.userId),
        disconnectedUserIds: options.players.filter((player) => !player.connected).map((player) => player.userId)
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
    this.startedAt = options.scheduler.now();
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

  /** Sends the current view to one user, for example after a reconnect. */
  sendSnapshot(userId: string): void {
    this.options.transport.send(userId, "game:state", this.viewFor(userId));

    const results = getMatchResults(this.state);
    if (results) {
      this.options.transport.send(userId, "game:ended", results);
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
      const kind = playerKind();
      const standing = standings.find((entry) => entry.userId === player.userId);
      return {
        seat: player.seat,
        kind,
        accountId: null,
        displayName: this.displayNames.get(player.userId) ?? player.userId,
        finalStatus: player.matchStatus,
        finishPosition: player.finishPosition,
        xpEarned: kind === "registered" && standing ? getMatchXp(standing, standings) : 0
      };
    });

    // The first player to finish is the winner, even if the match was aborted later.
    const winnerId = results?.winnerId ?? this.state.finishingOrder[0];
    const winner = this.state.players.find((player) => player.userId === winnerId);

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

    const { transport, recipients } = this.options;
    for (const effect of result.effects) {
      for (const userId of recipients()) {
        transport.send(userId, "game:effect", effect);
      }
    }

    for (const event of result.privateEvents) {
      if (event.type === "spyReveal") {
        transport.send(event.userId, "game:spyReveal", event.reveal);
      } else {
        transport.send(event.userId, "game:swapResult", event.result);
      }
    }

    this.broadcastState();

    const results = getMatchResults(this.state);
    if (results) {
      for (const userId of recipients()) {
        transport.send(userId, "game:ended", results);
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
      this.options.transport.send(userId, "game:state", toMatchView(this.state, userId, context, publicView));
    }
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

/** Every human plays as a guest until accounts exist (docs/03 section 2); bots are not seated yet. */
function playerKind(): PlayerKind {
  return "guest";
}
