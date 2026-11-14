// Computer players (docs/03 sections 3 and 6): legal-action enumeration against the engine, the
// information rule of the bot memory, consistent determinizations, and complete bot matches.

import { describe, expect, it } from "vitest";
import {
  BOT_LEVELS,
  DECK_SIZE,
  cardSignature,
  getDrawOption,
  getLegalActions,
  getLegalCards,
  isPlayableOn,
  type BotLevel,
  type PlayerMatchView
} from "@wildhand/shared";
import { runHeadlessMatch } from "../../src/bots/headless-match.js";
import { blockChance, evaluationContext } from "../../src/bots/heuristic-bot.js";
import { BotMemory } from "../../src/bots/memory.js";
import { chooseByRules, ruleBasedBot } from "../../src/bots/rule-based-bot.js";
import { applyLegalAction, determinize } from "../../src/bots/simulation.js";
import { createSeededRng } from "../../src/engine/rng.js";
import { toMatchView } from "../../src/engine/views.js";
import type { MatchState } from "../../src/engine/state.js";
import { buildState, colorChange, num, plus2, storm } from "../engine/helpers.js";

const VIEW_CONTEXT = { displayName: (userId: string) => userId, turnDeadline: null, serverTime: 0 };
const BOT_MATCH_TIMEOUT_MS = 60_000;

function viewOf(state: MatchState, userId: string): PlayerMatchView {
  return toMatchView(state, userId, VIEW_CONTEXT) as PlayerMatchView;
}

describe("getLegalActions against the engine", () => {
  it(
    "lists only actions the engine accepts, and covers every legal card and the draw option",
    () => {
      let checked = 0;
      for (let seed = 1; seed <= 7; seed++) {
        runHeadlessMatch({
          seed,
          levels: Array.from({ length: 1 + seed }, () => "random" as const),
          budgetMs: 1,
          maxActions: 600,
          inspect: (state, player) => {
            const view = viewOf(state, player.userId);
            const actions = getLegalActions(view);
            const rng = createSeededRng(seed);

            for (const action of actions) {
              const result = applyLegalAction(state, player.userId, action, rng);
              expect(result.ok, JSON.stringify(action)).toBe(true);
              checked++;
            }

            const starters = new Set(
              actions.flatMap((action) =>
                action.type === "play" ? [cardSignature(view.hand.find((card) => card.id === action.cardIds[0])!)] : []
              )
            );
            for (const card of getLegalCards(view)) {
              expect(starters.has(cardSignature(card))).toBe(true);
            }
            expect(actions.some((action) => action.type === "draw")).toBe(getDrawOption(view) !== null);
          }
        });
      }
      expect(checked).toBeGreaterThan(1_000);
    },
    BOT_MATCH_TIMEOUT_MS
  );
});

describe("bot memory and determinization", () => {
  it(
    "tracks the discard pile exactly and builds complete states consistent with the bot's view",
    () => {
      runHeadlessMatch({
        seed: 5,
        levels: ["heuristic", "random", "rule_based", "random"],
        budgetMs: 1,
        inspect: (state, player) => {
          const memory = player.memory;
          // The memory is built from messages only; the authoritative state is used here to check it.
          expect(memory.discardPile.map((card) => card.id)).toEqual(state.discardPile.map((card) => card.id));
          expect(memory.decksInPlay).toBe(state.decksInPlay);

          // Known cards are really in that player's hand.
          for (const other of state.players) {
            const handIds = new Set(other.hand.map((card) => card.id));
            for (const card of memory.knownCards(other.userId)) {
              expect(handIds.has(card.id), `${card.id} known in ${other.userId}`).toBe(true);
            }
          }

          const view = viewOf(state, player.userId);
          const sample = determinize(view, memory, createSeededRng(state.stateVersion));
          const all = [
            ...sample.players.flatMap((candidate) => candidate.hand),
            ...sample.drawPile,
            ...sample.discardPile,
            ...sample.removedCards
          ];
          expect(all).toHaveLength(state.decksInPlay * DECK_SIZE);
          expect(new Set(all.map((card) => card.id)).size).toBe(all.length);
          expect(sample.drawPile).toHaveLength(state.drawPile.length);
          sample.players.forEach((candidate, seat) => {
            expect(candidate.hand).toHaveLength(state.players[seat].hand.length);
          });
          expect(sample.players.find((candidate) => candidate.userId === player.userId)!.hand).toEqual(view.hand);
          for (const other of sample.players) {
            const ids = new Set(other.hand.map((card) => card.id));
            for (const card of memory.knownCards(other.userId)) {
              expect(ids.has(card.id)).toBe(true);
            }
          }
        }
      });
    },
    BOT_MATCH_TIMEOUT_MS
  );

  it("remembers Spy snapshots and Swap exchanges, and forgets cards that were played", () => {
    const memory = new BotMemory("p0");
    const red5 = num("red", 5);
    const blue7 = num("blue", 7);
    const green1 = num("green", 1);

    memory.observeSpy({ targetPlayerId: "p1", hand: [red5, blue7] });
    memory.observeSwap({ otherPlayerId: "p1", given: green1, received: blue7 });
    expect(memory.knownCards("p1").map((card) => card.id).sort()).toEqual([green1.id, red5.id].sort());

    memory.observeEffect({ type: "cardsPlayed", userId: "p1", cards: [red5], chosenColor: null });
    expect(memory.knownCards("p1")).toEqual([green1]);

    // A blind exchange between two other players makes the knowledge unreliable.
    memory.observeEffect({ type: "swap", actorId: "p2", targetId: "p1", exchanged: true });
    expect(memory.knownCards("p1")).toEqual([]);
  });
});

describe("inferences from draws", () => {
  /** p0 is the bot; p1 holds `p1Hand`; the top card is a red 5. */
  function observed(p1Hand: ReturnType<typeof num>[]) {
    const state = buildState({ hands: [[num("blue", 1), num("green", 2)], p1Hand, unplayableHand(3)], top: num("red", 5), current: 1 });
    const memory = new BotMemory("p0");
    memory.observeState(viewOf(state, "p0"));
    return { state, memory };
  }
  const unplayableHand = (count: number) => Array.from({ length: count }, () => num("blue", 1));

  it("records that a player who drew could not play on the table, until they play those cards", () => {
    const { memory } = observed(unplayableHand(4));
    memory.observeEffect({ type: "cardDrawn", draw: { userId: "p1", requested: 1, actual: 1 } });
    expect(memory.constraintsOf("p1")).toEqual([
      { context: { topCard: expect.objectContaining({ color: "red", number: 5 }), activeColor: null, pendingPenalty: 0 }, remaining: 4 }
    ]);

    memory.observeEffect({ type: "cardsPlayed", userId: "p1", cards: [num("blue", 1), num("blue", 1)], chosenColor: null });
    expect(memory.constraintsOf("p1")[0].remaining).toBe(2);

    memory.observeSpy({ targetPlayerId: "p1", hand: [] });
    expect(memory.constraintsOf("p1")).toEqual([]);
  });

  it("deals sampled hands that respect the inference", () => {
    const { state, memory } = observed(unplayableHand(6));
    memory.observeEffect({ type: "cardDrawn", draw: { userId: "p1", requested: 1, actual: 1 } });
    const context = memory.constraintsOf("p1")[0].context;

    for (let seed = 1; seed <= 20; seed++) {
      const sample = determinize(viewOf(state, "p0"), memory, createSeededRng(seed));
      const hand = sample.players[1].hand;
      expect(hand).toHaveLength(6);
      expect(hand.some((card) => isPlayableOn(card, context))).toBe(false);
    }
  });

  it("estimates how likely the next player is blocked", () => {
    const { state, memory } = observed(unplayableHand(4));
    const view = viewOf(state, "p0");
    const p1 = view.players[1];
    const table = { topCard: num("red", 5), activeColor: null, pendingPenalty: 0 };

    const before = blockChance(memory, evaluationContext(view, memory)!, p1, table);
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(0.5);

    // After a draw on the same table, the four cards cannot follow it.
    memory.observeEffect({ type: "cardDrawn", draw: { userId: "p1", requested: 1, actual: 1 } });
    expect(blockChance(memory, evaluationContext(view, memory)!, p1, table)).toBe(1);

    // A known card that follows the table means the player is not blocked.
    memory.observeSwap({ otherPlayerId: "p1", given: num("red", 7), received: num("blue", 1) });
    expect(blockChance(memory, evaluationContext(view, memory)!, p1, table)).toBe(0);
  });
});

describe("level-2 rule-based bot", () => {
  const decide = (state: MatchState) => {
    const view = viewOf(state, "p0");
    return ruleBasedBot.decide({
      view,
      memory: new BotMemory("p0"),
      actions: getLegalActions(view),
      rng: createSeededRng(1),
      now: () => 0,
      deadline: 0
    });
  };

  it("answers a +2 penalty with a +2 chain", () => {
    const answer = plus2("blue");
    const state = buildState({
      hands: [[num("red", 1), answer, storm()], [num("red", 2)]],
      top: plus2("red"),
      pendingPenalty: 2
    });
    expect(decide(state)).toEqual({ type: "play", cardIds: [answer.id] });
  });

  it("plays one number card at a time and keeps its special cards", () => {
    const fives = [num("red", 5), num("blue", 5), num("green", 5)];
    const state = buildState({
      hands: [[colorChange(), ...fives, plus2("red")], Array.from({ length: 5 }, () => num("red", 2))],
      top: num("red", 9)
    });
    expect(decide(state)).toEqual({ type: "play", cardIds: [fives[0].id] });
  });
});

describe("playout rules of the sampling bot", () => {
  const decide = (state: MatchState) => {
    const view = viewOf(state, "p0");
    return chooseByRules(view, getLegalActions(view));
  };

  it("answers a +2 penalty with a +2 chain", () => {
    const answer = plus2("blue");
    const state = buildState({
      hands: [[num("red", 1), answer, storm()], [num("red", 2)]],
      top: plus2("red"),
      pendingPenalty: 2
    });
    expect(decide(state)).toEqual({ type: "play", cardIds: [answer.id] });
  });

  it("plays the longest combo and keeps +2 and wild cards", () => {
    const fives = [num("red", 5), num("blue", 5), num("green", 5)];
    const state = buildState({
      hands: [[...fives, plus2("red"), colorChange()], Array.from({ length: 5 }, () => num("red", 2))],
      top: num("red", 9)
    });
    const action = decide(state);
    expect(action.type === "play" && action.cardIds.length).toBe(3);
  });

  it("chooses the color it holds most with Color Change", () => {
    const state = buildState({
      hands: [[colorChange(), num("green", 1), num("green", 3), num("blue", 2)], Array.from({ length: 5 }, () => num("red", 2))],
      top: num("red", 9)
    });
    expect(decide(state)).toMatchObject({ chosenColor: "green" });
  });

  it("attacks a next player who is about to finish", () => {
    const attack = plus2("red");
    const state = buildState({
      hands: [[num("red", 1), attack], [num("blue", 2)]],
      top: num("red", 9)
    });
    expect(decide(state)).toEqual({ type: "play", cardIds: [attack.id] });
  });
});

describe("complete bot matches", () => {
  it.each(BOT_LEVELS)(
    "%s bots finish matches without a rejected action",
    (level: BotLevel) => {
      for (const count of [2, 4, 8]) {
        const levels: BotLevel[] = Array.from({ length: count }, (_, seat) => (seat === 0 ? level : "random"));
        const match = runHeadlessMatch({ seed: count * 31, levels, budgetMs: 2 });
        expect(match.rejected).toBe(0);
        expect(match.results).not.toBeNull();
        expect(match.results!.standings).toHaveLength(count);
      }
    },
    BOT_MATCH_TIMEOUT_MS
  );

  it("is reproducible from the seed", () => {
    const run = () =>
      runHeadlessMatch({ seed: 99, levels: ["heuristic", "rule_based", "random"], budgetMs: 1 }).results;
    expect(run()).toEqual(run());
  });
});
