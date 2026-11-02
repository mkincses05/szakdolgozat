// Pure game engine: no Socket.IO, timers, or database (docs/04).

export { applyDraw, applyForfeit, applyPlay, applyTimeout, setPresence } from "./actions.js";
export { hasLegalCard, isLegalCard, isPlayable } from "./legality.js";
export { createSeededRng, shuffle, type Rng } from "./rng.js";
export { createMatch, type CreateMatchResult, type MatchSetup } from "./setup.js";
export {
  activePlayers,
  findPlayer,
  topCard,
  validTargets,
  type EngineResult,
  type MatchPlayer,
  type MatchState,
  type PlayAction,
  type PrivateEvent
} from "./state.js";
export { getMatchResults, isBlocked } from "./turn.js";
export { toMatchView, toPublicMatchView, type ViewContext } from "./views.js";
