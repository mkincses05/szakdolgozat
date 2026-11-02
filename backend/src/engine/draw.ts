// Drawing with the hand limit (R16) and draw-pile recycling (R19). Every card-drawing effect uses
// drawCards, so the limit and the recycling are applied in one place.

import { HAND_LIMIT, RESHUFFLE_THRESHOLD, createDeck, type DrawResult, type GameEffect } from "@wildhand/shared";
import { shuffle, type Rng } from "./rng.js";
import type { MatchPlayer, MatchState } from "./state.js";

/** Mutates `state`. Draws up to `requested` cards, capped by the hand limit. */
export function drawCards(
  state: MatchState,
  player: MatchPlayer,
  requested: number,
  rng: Rng,
  effects: GameEffect[]
): DrawResult {
  const actual = Math.max(0, Math.min(requested, HAND_LIMIT - player.hand.length));

  for (let i = 0; i < actual; i++) {
    if (state.drawPile.length === 0) {
      recycleDiscardPile(state, rng, effects);
    }

    player.hand.push(state.drawPile.pop()!);
  }

  return { userId: player.userId, requested, actual };
}

/** R19: keeps the top card, reuses the rest, and adds a new deck when 25 or fewer are reusable. */
function recycleDiscardPile(state: MatchState, rng: Rng, effects: GameEffect[]): void {
  const top = state.discardPile.pop()!;
  const reusable = state.discardPile;
  const reusedCards = reusable.length;
  const deckAdded = reusedCards <= RESHUFFLE_THRESHOLD;

  if (deckAdded) {
    state.decksInPlay += 1;
    reusable.push(...createDeck(state.decksInPlay));
  }

  state.drawPile = shuffle(reusable, rng);
  state.discardPile = [top];
  effects.push({ type: "reshuffle", reusedCards, deckAdded, decksInPlay: state.decksInPlay });
}
