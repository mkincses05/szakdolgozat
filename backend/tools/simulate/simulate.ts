// Headless match simulator for trying out the rules without a frontend. Random legal moves only,
// not a bot. Self-contained: deleting this folder removes it without affecting anything else.
//
//   npx tsx tools/simulate/simulate.ts [--players 4] [--seed 42] [--hands] [--quiet]

import { randomInt } from "node:crypto";
import { CARD_COLORS, HAND_LIMIT, isNumberCard, type Card, type GameEffect } from "@wildhand/shared";
import {
  applyDraw,
  applyPlay,
  createMatch,
  createSeededRng,
  findPlayer,
  getMatchResults,
  isLegalCard,
  topCard,
  validTargets,
  type EngineResult,
  type MatchState,
  type PlayAction,
  type PrivateEvent,
  type Rng
} from "../../src/engine/index.js";

const MAX_ACTIONS = 5_000;
/** Chance of playing a legal card instead of drawing voluntarily. */
const PLAY_PROBABILITY = 0.9;

interface Options {
  players: number;
  seed: number;
  hands: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { players: 4, seed: randomInt(2 ** 31), hands: false, quiet: false };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--players") options.players = Number(argv[++index]);
    else if (arg === "--seed") options.seed = Number(argv[++index]);
    else if (arg === "--hands") options.hands = true;
    else if (arg === "--quiet") options.quiet = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.players) || !Number.isInteger(options.seed)) {
    throw new Error("--players and --seed must be integers");
  }
  return options;
}

// ---------- formatting ----------

function formatCard(card: Card): string {
  switch (card.kind) {
    case "number":
      return `${card.color} ${card.number}`;
    case "plus2":
      return `${card.color} +2`;
    case "swap":
      return `${card.color} Swap`;
    case "storm":
      return "Storm";
    case "colorChange":
      return "Color Change";
    case "spy":
      return "Spy";
  }
}

const formatCards = (cards: Card[]) => cards.map(formatCard).join(", ");

function formatEffect(effect: GameEffect): string {
  switch (effect.type) {
    case "cardsPlayed":
      return `${effect.userId} plays ${formatCards(effect.cards)}${effect.chosenColor ? ` and chooses ${effect.chosenColor}` : ""}`;
    case "cardDrawn":
      return `${effect.draw.userId} draws ${effect.draw.actual}`;
    case "passed":
      return `${effect.userId} passes (${HAND_LIMIT} cards, no legal card)`;
    case "penaltyDrawn":
      return `${effect.draw.userId} takes the +2 penalty: ${effect.draw.requested} requested, ${effect.draw.actual} drawn${effect.draw.actual < effect.draw.requested ? " (hand limit)" : ""}`;
    case "storm":
      return `Storm ${effect.value}: ${effect.draws.map((draw) => `${draw.userId} +${draw.actual}`).join(", ")}`;
    case "swap":
      return effect.exchanged
        ? `${effect.actorId} swaps a card with ${effect.targetId}`
        : `${effect.actorId}'s Swap with ${effect.targetId} is skipped (no card left)`;
    case "spy":
      return `${effect.actorId} spies on ${effect.targetId}`;
    case "reshuffle":
      return `Draw pile empty: ${effect.reusedCards} discard cards reused${effect.deckAdded ? `, new deck added (${effect.decksInPlay} decks in play)` : ""}`;
    case "playerFinished":
      return `${effect.userId} finishes in position ${effect.position}`;
    case "playerForfeited":
      return `${effect.userId} forfeits`;
  }
}

function formatPrivateEvent(event: PrivateEvent): string {
  if (event.type === "spyReveal") {
    return `  (only ${event.userId} sees: ${formatCards(event.reveal.hand)})`;
  }
  return `  (${event.userId} gives ${formatCard(event.result.given)} to ${event.result.otherPlayerId}, receives ${formatCard(event.result.received)})`;
}

function formatTable(state: MatchState): string {
  const parts = [`top: ${formatCard(topCard(state))}`];
  if (state.activeColor) parts.push(`color: ${state.activeColor}`);
  if (state.pendingPenalty > 0) parts.push(`penalty: ${state.pendingPenalty}`);
  parts.push(`draw pile: ${state.drawPile.length}`);
  const hands = state.players
    .filter((player) => player.matchStatus === "active")
    .map((player) => `${player.userId}:${player.hand.length}`)
    .join(" ");
  return `   [${parts.join(" | ")}]  hands ${hands}`;
}

// ---------- random legal moves ----------

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[rng.nextInt(0, items.length - 1)];
}

function randomPlay(state: MatchState, userId: string, rng: Rng): PlayAction | null {
  const player = findPlayer(state, userId)!;
  const legal = player.hand.filter((card) => isLegalCard(card, state, userId));
  if (legal.length === 0) {
    return null;
  }

  const first = pick(legal, rng);
  const action: PlayAction = { cardIds: [first.id] };

  if (isNumberCard(first)) {
    for (const card of player.hand) {
      if (card !== first && isNumberCard(card) && card.number === first.number) {
        action.cardIds.push(card.id);
      }
    }
  }

  if (first.kind === "colorChange") {
    action.chosenColor = pick(CARD_COLORS, rng);
  }

  if (first.kind === "swap" || first.kind === "spy") {
    const target = pick(validTargets(state, userId), rng);
    action.targetPlayerId = target.userId;

    if (first.kind === "swap" && player.hand.length > 1) {
      action.swapCardId = pick(
        player.hand.filter((card) => card !== first),
        rng
      ).id;
      action.targetCardPosition = rng.nextInt(0, target.hand.length - 1);
    }
  }

  return action;
}

function takeTurn(state: MatchState, rng: Rng): EngineResult {
  const userId = state.currentPlayerId!;
  const player = findPlayer(state, userId)!;
  const play = randomPlay(state, userId, rng);
  const mustPlay = state.pendingPenalty === 0 && player.hand.length >= HAND_LIMIT;

  if (play && (mustPlay || rng.nextInt(0, 99) < PLAY_PROBABILITY * 100)) {
    return applyPlay(state, userId, play, rng);
  }
  return applyDraw(state, userId, rng);
}

// ---------- main ----------

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const log = (line: string) => {
    if (!options.quiet) console.log(line);
  };

  const rng = createSeededRng(options.seed);
  const userIds = Array.from({ length: options.players }, (_, index) => `p${index}`);
  const created = createMatch({ matchId: `sim-${options.seed}`, userIds }, rng);
  if (!created.ok) {
    throw new Error(`Cannot create match: ${created.code}`);
  }

  let state = created.state;
  console.log(`Wildhand simulation: ${options.players} players, seed ${options.seed}`);
  log(`Starting card: ${formatCard(topCard(state))}, ${state.currentPlayerId} starts`);
  log(formatTable(state));

  let turn = 0;
  while (state.phase !== "ended" && turn < MAX_ACTIONS) {
    turn++;
    if (options.hands) {
      const player = findPlayer(state, state.currentPlayerId!)!;
      log(`   ${player.userId} holds: ${formatCards(player.hand)}`);
    }

    const result = takeTurn(state, rng);
    if (!result.ok) {
      throw new Error(`Turn ${turn} was rejected: ${result.code}`);
    }

    log(`#${turn} ${result.effects.map(formatEffect).join("; ")}`);
    // Each Swap produces one event per participant; log the acting player's side only.
    const actorId = findActor(result.effects);
    for (const event of result.privateEvents) {
      if (event.userId === actorId) log(formatPrivateEvent(event));
    }

    state = result.state;
    if (state.phase !== "ended") log(formatTable(state));
  }

  const results = getMatchResults(state);
  if (!results) {
    console.log(`\nThe match did not end within ${MAX_ACTIONS} turns.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nMatch ended after ${turn} turns (${results.endReason}), ${state.decksInPlay} deck(s) used.`);
  for (const standing of results.standings) {
    console.log(`  ${standing.position}. ${standing.userId}${standing.matchStatus === "forfeited" ? " (forfeited)" : ""}`);
  }
}

function findActor(effects: GameEffect[]): string | undefined {
  const played = effects.find((effect) => effect.type === "cardsPlayed");
  return played?.type === "cardsPlayed" ? played.userId : undefined;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
