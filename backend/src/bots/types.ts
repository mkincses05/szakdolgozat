// Common interface of the computer players (docs/03 section 3).

import type { BotLevel, LegalAction, PlayerMatchView } from "@wildhand/shared";
import type { Rng } from "../engine/rng.js";
import type { BotMemory } from "./memory.js";

export interface BotInput {
  /** The bot's own filtered view; it never sees other players' hands. */
  view: PlayerMatchView;
  memory: BotMemory;
  /** `getLegalActions(view)`; never empty on the bot's turn. */
  actions: readonly LegalAction[];
  /** The bot's own generator, never the match's, so a match stays reproducible from its seed. */
  rng: Rng;
  /** Milliseconds, comparable with `deadline`. */
  now(): number;
  /** The decision should be made before this time. */
  deadline: number;
}

export interface Bot {
  readonly level: BotLevel;
  decide(input: BotInput): LegalAction;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[rng.nextInt(0, items.length - 1)];
}
