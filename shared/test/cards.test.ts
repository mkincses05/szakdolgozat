import { describe, expect, it } from "vitest";
import {
  CARD_COLORS,
  DECK_SIZE,
  createDeck,
  isColoredCard,
  isColoredSpecialCard,
  isNumberCard,
  isSpecialCard,
  isWildCard
} from "../src/index.js";

describe("createDeck (R2)", () => {
  const deck = createDeck(1);

  it("contains 104 cards with unique IDs", () => {
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((card) => card.id)).size).toBe(DECK_SIZE);
  });

  it("contains 80 number cards: 4 colors × numbers 0–9 × 2 copies", () => {
    const numberCards = deck.filter(isNumberCard);
    expect(numberCards).toHaveLength(80);

    for (const color of CARD_COLORS) {
      for (let number = 0; number <= 9; number++) {
        expect(numberCards.filter((card) => card.color === color && card.number === number)).toHaveLength(2);
      }
    }
  });

  it("contains 2 +2 and 1 Swap per color", () => {
    for (const color of CARD_COLORS) {
      expect(deck.filter((card) => card.kind === "plus2" && card.color === color)).toHaveLength(2);
      expect(deck.filter((card) => card.kind === "swap" && card.color === color)).toHaveLength(1);
    }
  });

  it("contains 4 colorless Storm, Color Change, and Spy cards", () => {
    for (const kind of ["storm", "colorChange", "spy"] as const) {
      const cards = deck.filter((card) => card.kind === kind);
      expect(cards).toHaveLength(4);
      expect(cards.every((card) => !("color" in card) && !("number" in card))).toBe(true);
    }
  });

  it("gives special cards no number", () => {
    expect(deck.filter(isSpecialCard).every((card) => !("number" in card))).toBe(true);
  });

  it("prefixes IDs with the deck instance so added decks stay unique", () => {
    const secondDeck = createDeck(2);
    expect(secondDeck.every((card) => card.deckInstance === 2 && card.id.startsWith("d2-"))).toBe(true);
    expect(secondDeck.map((card) => card.id)).toContain("d2-red-7-b");

    const ids = new Set([...deck, ...secondDeck].map((card) => card.id));
    expect(ids.size).toBe(2 * DECK_SIZE);
  });
});

describe("card classification", () => {
  const deck = createDeck(1);
  const byKind = (kind: string) => deck.find((card) => card.kind === kind)!;

  it("classifies number, colored special, and wild cards", () => {
    expect(isNumberCard(byKind("number"))).toBe(true);
    expect(isColoredCard(byKind("number"))).toBe(true);
    expect(isSpecialCard(byKind("number"))).toBe(false);

    for (const kind of ["plus2", "swap"]) {
      expect(isColoredSpecialCard(byKind(kind))).toBe(true);
      expect(isColoredCard(byKind(kind))).toBe(true);
      expect(isWildCard(byKind(kind))).toBe(false);
    }

    for (const kind of ["storm", "colorChange", "spy"]) {
      expect(isWildCard(byKind(kind))).toBe(true);
      expect(isColoredCard(byKind(kind))).toBe(false);
      expect(isSpecialCard(byKind(kind))).toBe(true);
    }
  });
});
