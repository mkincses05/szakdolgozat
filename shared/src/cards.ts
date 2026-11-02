import {
  NUMBER_CARD_COPIES,
  PLUS2_COPIES_PER_COLOR,
  SWAP_COPIES_PER_COLOR,
  WILD_CARD_COPIES
} from "./constants.js";

export const CARD_COLORS = ["red", "blue", "green", "yellow"] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export const CARD_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type CardNumber = (typeof CARD_NUMBERS)[number];

export const COLORED_SPECIAL_KINDS = ["plus2", "swap"] as const;
export type ColoredSpecialKind = (typeof COLORED_SPECIAL_KINDS)[number];

export const WILD_KINDS = ["storm", "colorChange", "spy"] as const;
export type WildKind = (typeof WILD_KINDS)[number];

export const CARD_KINDS = ["number", ...COLORED_SPECIAL_KINDS, ...WILD_KINDS] as const;
export type CardKind = (typeof CARD_KINDS)[number];

interface CardBase {
  /** Unique across every deck in the match, for example `d2-red-7-b`. */
  id: string;
  /** 1 for the base deck, increased for each deck added by R19. */
  deckInstance: number;
}

export interface NumberCard extends CardBase {
  kind: "number";
  color: CardColor;
  number: CardNumber;
}

export interface ColoredSpecialCard extends CardBase {
  kind: ColoredSpecialKind;
  color: CardColor;
}

export interface WildCard extends CardBase {
  kind: WildKind;
}

export type Card = NumberCard | ColoredSpecialCard | WildCard;
export type ColoredCard = NumberCard | ColoredSpecialCard;
export type SpecialCard = ColoredSpecialCard | WildCard;

export function isNumberCard(card: Card): card is NumberCard {
  return card.kind === "number";
}

export function isColoredSpecialCard(card: Card): card is ColoredSpecialCard {
  return (COLORED_SPECIAL_KINDS as readonly CardKind[]).includes(card.kind);
}

export function isWildCard(card: Card): card is WildCard {
  return (WILD_KINDS as readonly CardKind[]).includes(card.kind);
}

export function isColoredCard(card: Card): card is ColoredCard {
  return !isWildCard(card);
}

export function isSpecialCard(card: Card): card is SpecialCard {
  return !isNumberCard(card);
}

/** Copy suffix for card IDs: 0 -> `a`, 1 -> `b`, ... */
function copyLetter(copy: number): string {
  return String.fromCharCode("a".charCodeAt(0) + copy);
}

/**
 * Creates one complete 104-card deck (R2) in a fixed, unshuffled order.
 * Card IDs are prefixed with the deck instance, so cards of added decks stay unique.
 */
export function createDeck(deckInstance: number): Card[] {
  const prefix = `d${deckInstance}`;
  const cards: Card[] = [];

  for (const color of CARD_COLORS) {
    for (const number of CARD_NUMBERS) {
      for (let copy = 0; copy < NUMBER_CARD_COPIES; copy++) {
        cards.push({
          id: `${prefix}-${color}-${number}-${copyLetter(copy)}`,
          deckInstance,
          kind: "number",
          color,
          number
        });
      }
    }

    for (let copy = 0; copy < PLUS2_COPIES_PER_COLOR; copy++) {
      cards.push({ id: `${prefix}-${color}-plus2-${copyLetter(copy)}`, deckInstance, kind: "plus2", color });
    }

    for (let copy = 0; copy < SWAP_COPIES_PER_COLOR; copy++) {
      cards.push({ id: `${prefix}-${color}-swap-${copyLetter(copy)}`, deckInstance, kind: "swap", color });
    }
  }

  for (const kind of WILD_KINDS) {
    for (let copy = 0; copy < WILD_CARD_COPIES; copy++) {
      cards.push({ id: `${prefix}-${kind}-${copyLetter(copy)}`, deckInstance, kind });
    }
  }

  return cards;
}
