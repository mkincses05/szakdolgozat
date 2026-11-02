import { expect } from "vitest";
import {
  createDeck,
  type Card,
  type CardColor,
  type CardNumber,
  type ColoredSpecialCard,
  type NumberCard,
  type Presence,
  type WildCard
} from "@wildhand/shared";
import type { Rng } from "../../src/engine/rng.js";
import type { EngineResult, MatchState } from "../../src/engine/state.js";

let nextCardId = 0;

function cardId(label: string): string {
  return `t-${label}-${nextCardId++}`;
}

export function num(color: CardColor, number: CardNumber): NumberCard {
  return { id: cardId(`${color}-${number}`), deckInstance: 1, kind: "number", color, number };
}

export function plus2(color: CardColor): ColoredSpecialCard {
  return { id: cardId(`${color}-plus2`), deckInstance: 1, kind: "plus2", color };
}

export function swap(color: CardColor): ColoredSpecialCard {
  return { id: cardId(`${color}-swap`), deckInstance: 1, kind: "swap", color };
}

export function storm(): WildCard {
  return { id: cardId("storm"), deckInstance: 1, kind: "storm" };
}

export function colorChange(): WildCard {
  return { id: cardId("colorChange"), deckInstance: 1, kind: "colorChange" };
}

export function spy(): WildCard {
  return { id: cardId("spy"), deckInstance: 1, kind: "spy" };
}

/** `count` number cards that are not playable on a red 5 or red number top card. */
export function unplayable(count: number): Card[] {
  return Array.from({ length: count }, (_, index) => num(index % 2 === 0 ? "blue" : "green", 1));
}

export interface StateOptions {
  hands: Card[][];
  top: Card;
  /** Cards below the top card, bottom first. */
  discardBelow?: Card[];
  /** The last element is drawn first. Defaults to a full deck. */
  drawPile?: Card[];
  current?: number;
  activeColor?: CardColor | null;
  pendingPenalty?: number;
  presence?: Presence[];
}

/** Builds a running match with players `p0`, `p1`, ... in seat order. */
export function buildState(options: StateOptions): MatchState {
  return {
    id: "match-1",
    phase: "awaiting_action",
    players: options.hands.map((hand, seat) => ({
      userId: `p${seat}`,
      seat,
      hand,
      matchStatus: "active",
      presence: options.presence?.[seat] ?? "connected",
      finishPosition: null,
      isBot: false
    })),
    currentPlayerId: `p${options.current ?? 0}`,
    drawPile: options.drawPile ?? createDeck(1),
    discardPile: [...(options.discardBelow ?? []), options.top],
    removedCards: [],
    activeColor: options.activeColor ?? null,
    pendingPenalty: options.pendingPenalty ?? 0,
    decksInPlay: 1,
    stateVersion: 0,
    finishingOrder: [],
    forfeitOrder: [],
    endReason: null
  };
}

/** Always returns `value`, clamped to the requested range. */
export function fixedRng(value: number): Rng {
  return { nextInt: (min, max) => Math.min(max, Math.max(min, value)) };
}

export function expectOk(result: EngineResult): Extract<EngineResult, { ok: true }> {
  if (!result.ok) {
    expect.fail(`expected ok, got ${result.code}`);
  }
  return result;
}

export function hand(state: MatchState, userId: string): Card[] {
  return state.players.find((player) => player.userId === userId)!.hand;
}

export function player(state: MatchState, userId: string) {
  return state.players.find((candidate) => candidate.userId === userId)!;
}
