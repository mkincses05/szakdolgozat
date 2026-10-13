// Effect summaries of resolved actions. Public effects never contain private cards;
// Spy and Swap details go only to the involved players (R12, R14, R25).

import type { Card, CardColor } from "./cards.js";

/** One player's draw within an effect; `actual` is capped by the hand limit (R16). */
export interface DrawResult {
  userId: string;
  requested: number;
  actual: number;
}

/** Public effect summaries broadcast with `game:effect`. */
export type GameEffect =
  | { type: "cardsPlayed"; userId: string; cards: Card[]; chosenColor: CardColor | null }
  | { type: "cardDrawn"; draw: DrawResult }
  | { type: "passed"; userId: string }
  | { type: "penaltyDrawn"; draw: DrawResult }
  | { type: "storm"; stormPlayerId: string; value: number; draws: DrawResult[] }
  | { type: "swap"; actorId: string; targetId: string; exchanged: boolean }
  | { type: "spy"; actorId: string; targetId: string }
  | { type: "reshuffle"; reusedCards: number; deckAdded: boolean; decksInPlay: number }
  | { type: "playerFinished"; userId: string; position: number }
  | { type: "playerForfeited"; userId: string };

export type GameEffectType = GameEffect["type"];

/** Sent only to the Spy player (R14). */
export interface SpyReveal {
  targetPlayerId: string;
  hand: Card[];
}

/** Sent only to the two Swap participants, from the recipient's point of view (R12). */
export interface SwapResult {
  otherPlayerId: string;
  given: Card;
  received: Card;
}
