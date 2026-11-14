// Level 1: a uniformly random legal action, the baseline of the measurements (docs/03 section 4).

import { pick, type Bot } from "./types.js";

export const randomBot: Bot = {
  level: "random",
  decide: ({ actions, rng }) => pick(actions, rng)
};
