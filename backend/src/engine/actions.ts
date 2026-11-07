// Engine actions. Each action validates against the current state first and then applies the
// change to a copy, so a rejected action never changes the state and an accepted one is atomic.
// Plays follow the turn resolution contract (docs/01, section 6).

import {
  HAND_LIMIT,
  PLUS2_PENALTY,
  STORM_MAX,
  STORM_MIN,
  isNumberCard,
  isSpecialCard,
  type Card,
  type DrawResult,
  type ErrorCode,
  type GameEffect,
  type Presence
} from "@wildhand/shared";
import { drawCards } from "./draw.js";
import { hasLegalCard, isPlayable } from "./legality.js";
import { shuffle, type Rng } from "./rng.js";
import {
  findPlayer,
  validTargets,
  type EngineResult,
  type MatchPlayer,
  type MatchState,
  type PlayAction,
  type PrivateEvent
} from "./state.js";
import { completeTurn, endMatchIfOver } from "./turn.js";

/** Plays one card or a number combo with all of its effects (R4–R14, R20). */
export function applyPlay(state: MatchState, userId: string, action: PlayAction, rng: Rng): EngineResult {
  const error = checkTurn(state, userId) ?? validatePlay(state, findPlayer(state, userId)!, action);
  if (error) {
    return { ok: false, code: error };
  }

  const next = structuredClone(state);
  const player = findPlayer(next, userId)!;
  const effects: GameEffect[] = [];
  const privateEvents: PrivateEvent[] = [];

  // 1. Commit the played cards; the last card becomes the top card (R8).
  const cards = action.cardIds.map((cardId) => removeCard(player, cardId));
  const played = cards[cards.length - 1];
  next.discardPile.push(...cards);
  next.activeColor = played.kind === "colorChange" ? action.chosenColor! : null;
  effects.push({ type: "cardsPlayed", userId, cards, chosenColor: next.activeColor });

  // 2. Resolve the effects.
  switch (played.kind) {
    case "plus2":
      next.pendingPenalty += PLUS2_PENALTY;
      break;
    case "storm":
      resolveStorm(next, player, rng, effects);
      break;
    case "swap":
      resolveSwap(next, player, findPlayer(next, action.targetPlayerId!)!, action, rng, effects, privateEvents);
      break;
    case "spy": {
      const target = findPlayer(next, action.targetPlayerId!)!;
      privateEvents.push({
        type: "spyReveal",
        userId,
        reveal: { targetPlayerId: target.userId, hand: structuredClone(target.hand) }
      });
      effects.push({ type: "spy", actorId: userId, targetId: target.userId });
      break;
    }
  }

  // 3–4. Finish check (R20).
  if (player.hand.length === 0) {
    player.matchStatus = "finished";
    next.finishingOrder.push(userId);
    player.finishPosition = next.finishingOrder.length;
    effects.push({ type: "playerFinished", userId, position: player.finishPosition });
  }

  // 5–6. Next player or match end.
  completeTurn(next, userId, rng, effects);
  return commit(next, effects, privateEvents);
}

/** `game:draw`: draws the +2 penalty (R10), draws one card (R15), or passes at 20 cards (R17). */
export function applyDraw(state: MatchState, userId: string, rng: Rng): EngineResult {
  return resolveTurnWithoutPlay(state, userId, rng, false);
}

/** Turn timer expiry (R22): like a draw, but a player at 20 cards passes even with a legal card. */
export function applyTimeout(state: MatchState, userId: string, rng: Rng): EngineResult {
  return resolveTurnWithoutPlay(state, userId, rng, true);
}

/** R23: removes the player's hand from play; a pending penalty of the forfeiting player is discarded. */
export function applyForfeit(state: MatchState, userId: string, rng: Rng): EngineResult {
  const error = checkMatchPlayer(state, userId);
  if (error) {
    return { ok: false, code: error };
  }

  const next = structuredClone(state);
  const player = findPlayer(next, userId)!;
  const effects: GameEffect[] = [];

  player.matchStatus = "forfeited";
  next.removedCards.push(...player.hand);
  player.hand = [];
  next.forfeitOrder.push(userId);
  effects.push({ type: "playerForfeited", userId });

  if (next.currentPlayerId === userId) {
    next.pendingPenalty = 0;
    completeTurn(next, userId, rng, effects, "forfeits");
  } else {
    endMatchIfOver(next, "forfeits");
  }

  return commit(next, effects, []);
}

/**
 * Updates connection presence. A player who disconnects keeps their own turn (R23); when no active
 * player was connected, the first active player to reconnect takes the turn.
 */
export function setPresence(state: MatchState, userId: string, presence: Presence): EngineResult {
  const player = findPlayer(state, userId);
  if (!player) {
    return { ok: false, code: "not_in_match" };
  }

  if (player.presence === presence) {
    return { ok: true, state, effects: [], privateEvents: [] };
  }

  const next = structuredClone(state);
  const updated = findPlayer(next, userId)!;
  updated.presence = presence;

  if (
    presence === "connected" &&
    next.phase === "awaiting_action" &&
    next.currentPlayerId === null &&
    updated.matchStatus === "active"
  ) {
    next.currentPlayerId = userId;
  }

  // A presence change alone leaves the game as it was, so an action sent for the current version
  // stays valid; it is still validated against the new presence. Handing the turn to a
  // reconnecting player is a new version.
  if (next.currentPlayerId === state.currentPlayerId) {
    return { ok: true, state: next, effects: [], privateEvents: [] };
  }
  return commit(next, [], []);
}

function resolveTurnWithoutPlay(state: MatchState, userId: string, rng: Rng, timeout: boolean): EngineResult {
  const error = checkTurn(state, userId);
  if (error) {
    return { ok: false, code: error };
  }

  const original = findPlayer(state, userId)!;
  if (
    !timeout &&
    state.pendingPenalty === 0 &&
    original.hand.length >= HAND_LIMIT &&
    hasLegalCard(state, original)
  ) {
    return { ok: false, code: "hand_limit_reached" };
  }

  const next = structuredClone(state);
  const player = findPlayer(next, userId)!;
  const effects: GameEffect[] = [];

  if (next.pendingPenalty > 0) {
    const draw = drawCards(next, player, next.pendingPenalty, rng, effects);
    next.pendingPenalty = 0;
    effects.push({ type: "penaltyDrawn", draw });
  } else if (player.hand.length < HAND_LIMIT) {
    effects.push({ type: "cardDrawn", draw: drawCards(next, player, 1, rng, effects) });
  } else {
    effects.push({ type: "passed", userId });
  }

  completeTurn(next, userId, rng, effects);
  return commit(next, effects, []);
}

/** R11: one shared value, dealt clockwise from the player after the Storm player. */
function resolveStorm(state: MatchState, stormPlayer: MatchPlayer, rng: Rng, effects: GameEffect[]): void {
  const value = rng.nextInt(STORM_MIN, STORM_MAX);
  const count = state.players.length;
  const stormIndex = state.players.indexOf(stormPlayer);
  const draws: DrawResult[] = [];

  for (let step = 1; step < count; step++) {
    const player = state.players[(stormIndex + step) % count];
    if (player.matchStatus === "active") {
      draws.push(drawCards(state, player, value, rng, effects));
    }
  }

  effects.push({ type: "storm", stormPlayerId: stormPlayer.userId, value, draws });
}

/** R12: the chosen face-down position is mapped through a fresh random permutation. */
function resolveSwap(
  state: MatchState,
  actor: MatchPlayer,
  target: MatchPlayer,
  action: PlayAction,
  rng: Rng,
  effects: GameEffect[],
  privateEvents: PrivateEvent[]
): void {
  if (actor.hand.length === 0) {
    effects.push({ type: "swap", actorId: actor.userId, targetId: target.userId, exchanged: false });
    return;
  }

  const permutation = shuffle(
    target.hand.map((_card, index) => index),
    rng
  );
  const [received] = target.hand.splice(permutation[action.targetCardPosition!], 1);
  const given = removeCard(actor, action.swapCardId!);
  actor.hand.push(received);
  target.hand.push(given);

  effects.push({ type: "swap", actorId: actor.userId, targetId: target.userId, exchanged: true });
  privateEvents.push(
    { type: "swapResult", userId: actor.userId, result: { otherPlayerId: target.userId, given, received } },
    {
      type: "swapResult",
      userId: target.userId,
      result: { otherPlayerId: actor.userId, given: received, received: given }
    }
  );
}

function validatePlay(state: MatchState, player: MatchPlayer, action: PlayAction): ErrorCode | null {
  const { cardIds } = action;
  if (cardIds.length === 0 || new Set(cardIds).size !== cardIds.length) {
    return "invalid_payload";
  }

  const cards: Card[] = [];
  for (const cardId of cardIds) {
    const card = player.hand.find((candidate) => candidate.id === cardId);
    if (!card) {
      return "card_not_in_hand";
    }
    cards.push(card);
  }

  const first = cards[0];

  // R8, R9
  if (cards.length > 1) {
    if (cards.filter(isSpecialCard).length > 1) {
      return "too_many_special_cards";
    }

    const numbers = new Set(cards.map((card) => (isNumberCard(card) ? card.number : null)));
    if (numbers.size !== 1 || numbers.has(null)) {
      return "invalid_combo";
    }
  }

  // R7
  if (state.pendingPenalty > 0 && first.kind !== "plus2") {
    return "penalty_active";
  }

  if (!isPlayable(first, state)) {
    return "illegal_card";
  }

  // R13
  if (first.kind === "colorChange") {
    if (action.chosenColor === undefined) {
      return "missing_color";
    }
  } else if (action.chosenColor !== undefined) {
    return "unexpected_color";
  }

  // R9, R12, R14
  if (first.kind === "swap" || first.kind === "spy") {
    if (action.targetPlayerId === undefined) {
      return "missing_target";
    }
    if (!validTargets(state, player.userId).some((target) => target.userId === action.targetPlayerId)) {
      return "invalid_target";
    }
  } else if (action.targetPlayerId !== undefined) {
    return "unexpected_target";
  }

  // R12
  const hasSwapSelection = action.swapCardId !== undefined || action.targetCardPosition !== undefined;
  if (first.kind !== "swap" || player.hand.length === 1) {
    return hasSwapSelection ? "unexpected_swap_selection" : null;
  }

  if (action.swapCardId === undefined || action.targetCardPosition === undefined) {
    return "missing_swap_selection";
  }

  if (action.swapCardId === first.id || !player.hand.some((card) => card.id === action.swapCardId)) {
    return "card_not_in_hand";
  }

  const target = findPlayer(state, action.targetPlayerId!)!;
  const position = action.targetCardPosition;
  if (!Number.isInteger(position) || position < 0 || position >= target.hand.length) {
    return "invalid_target_position";
  }

  return null;
}

function checkMatchPlayer(state: MatchState, userId: string): ErrorCode | null {
  if (state.phase !== "awaiting_action") {
    return "match_not_running";
  }

  const player = findPlayer(state, userId);
  if (!player) {
    return "not_in_match";
  }

  return player.matchStatus === "active" ? null : "player_not_active";
}

function checkTurn(state: MatchState, userId: string): ErrorCode | null {
  return checkMatchPlayer(state, userId) ?? (state.currentPlayerId === userId ? null : "not_your_turn");
}

function removeCard(player: MatchPlayer, cardId: string): Card {
  const index = player.hand.findIndex((card) => card.id === cardId);
  return player.hand.splice(index, 1)[0];
}

function commit(state: MatchState, effects: GameEffect[], privateEvents: PrivateEvent[]): EngineResult {
  state.stateVersion += 1;
  return { ok: true, state, effects, privateEvents };
}
