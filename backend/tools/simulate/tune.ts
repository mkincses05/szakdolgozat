// Tunes the heuristic bot's weights (docs/03 section 4) with a simple coordinate search: one
// heuristic bot plays against rule-based bots on fixed seeds, and a weight change is kept when it
// improves the heuristic bot's average finishing position. The same seeds are used for every
// candidate, so the comparison is not distorted by different deals.
//
//   npx tsx tools/simulate/tune.ts [--games 200] [--seats 4] [--rounds 3] [--seed 1000]

import { createHeuristicBot, DEFAULT_HEURISTIC_WEIGHTS, type HeuristicWeights } from "../../src/bots/heuristic-bot.js";
import { createBot } from "../../src/bots/bot-player.js";
import { runHeadlessMatch } from "../../src/bots/headless-match.js";
import type { BotLevel } from "@wildhand/shared";

interface Options {
  games: number;
  seats: number;
  rounds: number;
  seed: number;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { games: 200, seats: 4, rounds: 3, seed: 1000 };
  for (let index = 0; index < argv.length; index += 2) {
    const value = Number(argv[index + 1]);
    if (!Number.isInteger(value)) throw new Error(`${argv[index]} needs an integer`);
    if (argv[index] === "--games") options.games = value;
    else if (argv[index] === "--seats") options.seats = value;
    else if (argv[index] === "--rounds") options.rounds = value;
    else if (argv[index] === "--seed") options.seed = value;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return options;
}

/** Average normalized position of the heuristic bot: 0 = always first, 1 = always last. */
function evaluate(weights: HeuristicWeights, options: Options): number {
  let total = 0;
  for (let game = 0; game < options.games; game++) {
    const heuristicSeat = game % options.seats;
    const levels: BotLevel[] = Array.from({ length: options.seats }, (_, seat) => (seat === heuristicSeat ? "heuristic" : "rule_based"));
    const match = runHeadlessMatch({
      seed: options.seed + game,
      levels,
      budgetMs: 1,
      botFactory: (level) => (level === "heuristic" ? createHeuristicBot(weights) : createBot(level))
    });
    const standing = match.results!.standings.find((entry) => entry.userId === match.userIds[heuristicSeat])!;
    total += (standing.position - 1) / (options.seats - 1);
  }
  return total / options.games;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  let best = { ...DEFAULT_HEURISTIC_WEIGHTS };
  let bestScore = evaluate(best, options);
  console.log(`start ${bestScore.toFixed(4)} ${JSON.stringify(best)}`);

  const keys = Object.keys(best) as (keyof HeuristicWeights)[];
  for (let round = 0; round < options.rounds; round++) {
    const step = 0.5 / (round + 1);
    for (const key of keys) {
      for (const factor of [1 + step, 1 - step, -1]) {
        const candidate = { ...best, [key]: key === "handGrowth" && factor < 0 ? best[key] : best[key] * factor };
        if (factor === -1 && key !== "handGrowth") {
          candidate[key] = 0;
        }
        const score = evaluate(candidate, options);
        if (score < bestScore) {
          best = candidate;
          bestScore = score;
          console.log(`round ${round + 1} ${key} -> ${candidate[key].toFixed(3)}: ${score.toFixed(4)}`);
        }
      }
    }
  }

  console.log(`best ${bestScore.toFixed(4)} ${JSON.stringify(best)}`);
}

main();
