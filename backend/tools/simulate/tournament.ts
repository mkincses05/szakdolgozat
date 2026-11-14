// Bot tournament (docs/03 section 4): plays many headless matches between bot levels with fixed
// seeds and rotated seats, and reports finishing positions, win rates with 95% confidence
// intervals, decision times, and rejected actions.
//
//   npx tsx tools/simulate/tournament.ts --levels heuristic,rule_based,random,random --games 200
//     [--seed 1] [--budget 50] [--playout 40] [--max-playouts 480] [--out results.json]
//
// `--max-playouts` limits the sampling bot by the number of playouts per decision instead of by time
// (the time budget is then raised so it never stops the search first). The result does not depend on
// the machine or its load, so such runs can be repeated exactly and run in parallel.
//
// Results are logged in docs/05-bot-measurement-log.md.

import { writeFileSync } from "node:fs";
import { BOT_LEVELS, isBotLevel, type BotLevel, type MatchEndReason } from "@wildhand/shared";
import { createBot } from "../../src/bots/bot-player.js";
import { runHeadlessMatch } from "../../src/bots/headless-match.js";
import { createSamplingBot, DEFAULT_SAMPLING_OPTIONS } from "../../src/bots/sampling-bot.js";

interface Options {
  levels: BotLevel[];
  games: number;
  seed: number;
  budgetMs: number;
  /** Playout length of the sampling bot, in actions. */
  playoutActions: number;
  /** Playouts per sampling-bot decision; `null` limits the search by time only. */
  maxPlayouts: number | null;
  out: string | null;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { levels: ["heuristic", "rule_based", "random", "random"], games: 100, seed: 1, budgetMs: 50, playoutActions: DEFAULT_SAMPLING_OPTIONS.playoutActions, maxPlayouts: null, out: null };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = argv[++index];
    if (arg === "--levels") {
      const levels = value.split(",");
      if (!levels.every(isBotLevel)) {
        throw new Error(`--levels takes a comma-separated list of ${BOT_LEVELS.join(", ")}`);
      }
      options.levels = levels;
    } else if (arg === "--games") options.games = Number(value);
    else if (arg === "--seed") options.seed = Number(value);
    else if (arg === "--budget") options.budgetMs = Number(value);
    else if (arg === "--playout") options.playoutActions = Number(value);
    else if (arg === "--max-playouts") options.maxPlayouts = Number(value);
    else if (arg === "--out") options.out = value;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.levels.length < 2 || options.levels.length > 8) {
    throw new Error("--levels needs 2 to 8 seats");
  }
  if (![options.games, options.seed, options.budgetMs, options.playoutActions, options.maxPlayouts ?? 0].every(Number.isInteger)) {
    throw new Error("--games, --seed, --budget, --playout, and --max-playouts must be integers");
  }
  return options;
}

interface LevelStats {
  seats: number;
  /** Per seat played: 0 for first place, 1 for last place. */
  normalizedPositions: number[];
  wins: number;
  forfeits: number;
  decisionMs: number[];
}

interface MatchLog {
  seed: number;
  levels: BotLevel[];
  endReason: MatchEndReason | "unfinished";
  positions: number[];
  actions: number;
  rejected: number;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Half width of the normal-approximation 95% confidence interval of the mean. */
function meanInterval(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return 1.96 * Math.sqrt(variance / values.length);
}

/** Wilson score interval of a proportion, 95%. */
function wilson(successes: number, trials: number): [number, number] {
  if (trials === 0) return [0, 0];
  const z = 1.96;
  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const center = (p + (z * z) / (2 * trials)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const COLUMN_WIDTHS = [12, 6, 16, 9, 16, 16, 8];
const row = (cells: string[]) => cells.map((cell, index) => cell.padEnd(COLUMN_WIDTHS[index])).join(" ");

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const seats = options.levels.length;
  const stats = new Map<BotLevel, LevelStats>();
  const matches: MatchLog[] = [];
  const endReasons = new Map<string, number>();
  let rejected = 0;

  for (const level of options.levels) {
    stats.set(level, { seats: 0, normalizedPositions: [], wins: 0, forfeits: 0, decisionMs: [] });
  }

  for (let game = 0; game < options.games; game++) {
    // Seats rotate, so no level profits from always starting at the same seat.
    const rotation = game % seats;
    const levels = options.levels.map((_level, seat) => options.levels[(seat + rotation) % seats]);
    const seed = options.seed + game;
    const match = runHeadlessMatch({
      seed,
      levels,
      budgetMs: options.maxPlayouts === null ? options.budgetMs : 60_000,
      botFactory: (level) =>
        level === "sampling"
          ? createSamplingBot({
              ...DEFAULT_SAMPLING_OPTIONS,
              playoutActions: options.playoutActions,
              ...(options.maxPlayouts === null ? {} : { maxPlayouts: options.maxPlayouts, maxIterations: Number.MAX_SAFE_INTEGER })
            })
          : createBot(level)
    });
    rejected += match.rejected;

    const positions = levels.map(() => 0);
    if (match.results) {
      const firstPlace = match.results.standings.filter((standing) => standing.position === 1);
      for (const standing of match.results.standings) {
        const seat = match.userIds.indexOf(standing.userId);
        const levelStats = stats.get(levels[seat])!;
        positions[seat] = standing.position;
        levelStats.seats++;
        levelStats.normalizedPositions.push((standing.position - 1) / (seats - 1));
        if (standing.position === 1 && firstPlace.length === 1) levelStats.wins++;
        if (standing.matchStatus === "forfeited") levelStats.forfeits++;
      }
    }
    for (const decision of match.decisions) {
      stats.get(decision.level)!.decisionMs.push(decision.durationMs);
    }

    const endReason = match.results?.endReason ?? "unfinished";
    endReasons.set(endReason, (endReasons.get(endReason) ?? 0) + 1);
    matches.push({ seed, levels, endReason, positions, actions: match.actions, rejected: match.rejected });

    if ((game + 1) % 10 === 0 || game + 1 === options.games) {
      process.stderr.write(`\r${game + 1}/${options.games} matches`);
    }
  }
  process.stderr.write("\n");

  console.log(`Wildhand bot tournament: ${options.games} matches, seats ${options.levels.join(", ")}, seed ${options.seed}, ${options.maxPlayouts === null ? `budget ${options.budgetMs} ms` : `${options.maxPlayouts} playouts per decision`}, playout ${options.playoutActions} actions`);
  console.log("");
  console.log("Average position: 0 = always first, 1 = always last. Intervals are 95% confidence intervals.");
  console.log("");
  console.log(row(["level", "seats", "avg position", "win rate", "win rate CI", "decision ms avg", "max"]));

  const summary = [...stats.entries()].map(([level, levelStats]) => {
    const average = mean(levelStats.normalizedPositions);
    const interval = meanInterval(levelStats.normalizedPositions);
    const winRate = levelStats.seats === 0 ? 0 : levelStats.wins / levelStats.seats;
    const [low, high] = wilson(levelStats.wins, levelStats.seats);
    const decisionAverage = mean(levelStats.decisionMs);
    const decisionMax = Math.max(0, ...levelStats.decisionMs);

    console.log(
      row([
        level,
        String(levelStats.seats),
        `${average.toFixed(3)} ± ${interval.toFixed(3)}`,
        percent(winRate),
        `${percent(low)} – ${percent(high)}`,
        decisionAverage.toFixed(2),
        decisionMax.toFixed(1)
      ])
    );

    return {
      level,
      seats: levelStats.seats,
      averageNormalizedPosition: average,
      averageNormalizedPositionInterval95: interval,
      winRate,
      winRateInterval95: [low, high],
      forfeits: levelStats.forfeits,
      decisionMsAverage: decisionAverage,
      decisionMsMax: decisionMax
    };
  });

  console.log("");
  console.log(`End reasons: ${[...endReasons.entries()].map(([reason, count]) => `${reason} ${count}`).join(", ")}`);
  console.log(`Average actions per match: ${mean(matches.map((match) => match.actions)).toFixed(1)}`);
  console.log(`Rejected actions: ${rejected}`);

  if (options.out) {
    writeFileSync(options.out, JSON.stringify({ options, summary, endReasons: Object.fromEntries(endReasons), rejected, matches }, null, 2));
    console.log(`Written to ${options.out}`);
  }

  if (rejected > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
