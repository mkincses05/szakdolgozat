// Level 4: determinized flat Monte Carlo, also called Perfect Information Monte Carlo (docs/03
// section 3). Each iteration samples one complete state consistent with the bot's knowledge, tries
// every candidate action on it, and plays the game forward with the rule-based policy. The action
// with the best average outcome wins. All candidates of an iteration share the same sample and the
// same random seed (common random numbers), so they are compared under equal conditions.
//
// Known limitation: every sample is solved as if the hidden cards were visible ("strategy fusion"),
// so the bot never plays to gather information on purpose. An ISMCTS tree, which avoids this, was
// weaker than this search with its paired comparisons (docs/05, entry 19).

import type { LegalAction } from "@wildhand/shared";
import { createSeededRng } from "../engine/rng.js";
import { DEFAULT_HEURISTIC_WEIGHTS, evaluationContext, scoreAction } from "./heuristic-bot.js";
import { chooseByRules } from "./rule-based-bot.js";
import { applyLegalAction, determinize, outcomeValue, playout } from "./simulation.js";
import type { Bot, BotInput } from "./types.js";

export interface SamplingOptions {
  /** Candidates kept after the heuristic pre-selection. */
  maxCandidates: number;
  /** Actions simulated after the candidate, counted over all players. */
  playoutActions: number;
  /** Upper bound of iterations even when time is left, so tests and simulations are deterministic. */
  maxIterations: number;
  /**
   * Upper bound of playouts per decision. With a generous time budget this makes the search
   * independent of the machine and its load, for fair measurements.
   */
  maxPlayouts: number;
}

export const DEFAULT_SAMPLING_OPTIONS: SamplingOptions = {
  maxCandidates: 8,
  playoutActions: 40,
  maxIterations: 1_000,
  maxPlayouts: Infinity
};

export function createSamplingBot(options: SamplingOptions = DEFAULT_SAMPLING_OPTIONS): Bot {
  return {
    level: "sampling",
    decide(input: BotInput): LegalAction {
      const { view, memory, actions, rng, now, deadline } = input;
      const candidates = preselect(input, options.maxCandidates);
      if (candidates.length === 1) {
        return candidates[0];
      }

      const totals = candidates.map(() => 0);
      const unseen = memory.unseenCards(view.hand);
      let iterations = 0;
      // At least one iteration, even when the deadline has already passed or the playout limit is
      // smaller than the number of candidates.
      while (
        iterations < options.maxIterations &&
        (iterations === 0 || ((iterations + 1) * candidates.length <= options.maxPlayouts && now() < deadline))
      ) {
        const sample = determinize(view, memory, rng, unseen);
        const seed = rng.nextInt(0, 2 ** 31 - 1);

        candidates.forEach((candidate, index) => {
          const sampleRng = createSeededRng(seed);
          const result = applyLegalAction(sample, view.userId, candidate, sampleRng);
          if (!result.ok) {
            totals[index] -= 1;
            return;
          }
          const end = playout(result.state, chooseByRules, options.playoutActions, sampleRng);
          totals[index] += outcomeValue(end, view.userId);
        });
        iterations++;
      }

      let bestIndex = 0;
      totals.forEach((total, index) => {
        if (total > totals[bestIndex]) {
          bestIndex = index;
        }
      });
      return candidates[bestIndex] ?? actions[0];
    }
  };
}

/** The heuristically best actions; the search time goes to the promising ones. */
function preselect({ view, memory, actions }: BotInput, maxCandidates: number): LegalAction[] {
  if (actions.length <= maxCandidates) {
    return [...actions];
  }
  const context = evaluationContext(view, memory);
  return actions
    .map((action) => ({ action, score: scoreAction(view, memory, action, DEFAULT_HEURISTIC_WEIGHTS, context) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((entry) => entry.action);
}
