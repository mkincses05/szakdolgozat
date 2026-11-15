// The shared frame of card faces and card backs. Every inner size is in `em`, so a card scales with
// its font size only.

export type CardSize = "xs" | "sm" | "md" | "lg" | "hand";

export const CARD_SIZE_CLASSES: Record<CardSize, string> = {
  xs: "text-[4px] md:text-[5px]",
  sm: "text-[8px] sm:text-[9px]",
  md: "text-[11px] sm:text-[13px]",
  lg: "text-[14px] sm:text-[17px]",
  /** Cards in the own hand: readable on phones, bigger on large screens. */
  hand: "text-[11px] sm:text-[12px] lg:text-[15px]"
};

export const CARD_FRAME_CLASSES =
  "relative block h-[8.4em] w-[5.6em] shrink-0 select-none overflow-hidden rounded-card border-[0.35em] border-card-paper shadow-card";

/** The plain background of each card color, for color dots and the color picker. */
export const CARD_COLOR_BG_CLASSES = {
  red: "bg-card-red",
  yellow: "bg-card-yellow",
  green: "bg-card-green",
  blue: "bg-card-blue"
} as const;
