// The own hand as a slightly curved fan of overlapping cards. The playable cards come from the
// shared helpers through `useCardSelection`; here they are only drawn. Hovered cards lift, selected
// cards rise and glow. A big hand scrolls sideways on narrow screens.

import type { Card } from "@wildhand/shared";
import clsx from "clsx";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { CARD_SIZE_CLASSES } from "../../../components/cardFrame";
import { PlayingCard } from "../../../components/PlayingCard";

interface HandAreaProps {
  hand: Card[];
  selectedIds: string[];
  selectableIds: ReadonlySet<string>;
  /** Unplayable cards are dimmed only on the player's own turn. */
  myTurn: boolean;
  onToggle: (card: Card) => void;
}

/** How far a card slides under its left neighbour, in card-width units (`em` of the card size). */
function overlapFor(count: number): number {
  if (count <= 6) return 0.6;
  if (count <= 10) return 2;
  if (count <= 15) return 3;
  return 3.6;
}

export function HandArea({ hand, selectedIds, selectableIds, myTurn, onToggle }: HandAreaProps) {
  const { t } = useTranslation("game");
  const headingId = useId();
  const overlap = overlapFor(hand.length);
  const middle = (hand.length - 1) / 2;
  // The fan gets flatter as it gets wider.
  const tilt = Math.min(4, 30 / Math.max(hand.length, 1));

  return (
    <section aria-labelledby={headingId} className="min-w-0" data-hand>
      <h2 id={headingId} className="sr-only">
        {t("hand.title", { count: hand.length })}
      </h2>
      {/* Room above for lifted cards and below for the curve, so only sideways scrolling remains. */}
      <div className="overflow-x-auto overflow-y-hidden px-3 pt-8 pb-7">
        <div className="mx-auto flex w-max items-end">
          {hand.map((card, index) => {
            const selected = selectedIds.includes(card.id);
            const playable = selected || selectableIds.has(card.id);
            const offset = index - middle;
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={selected}
                disabled={!playable}
                onClick={() => onToggle(card)}
                className={clsx(
                  CARD_SIZE_CLASSES.hand,
                  // New cards (dealt, drawn, or received with Swap) slide in.
                  "relative shrink-0 animate-card-enter cursor-pointer rounded-card transition-transform duration-150",
                  "focus-visible:z-20 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  "disabled:cursor-default",
                  selected
                    ? "z-10 -translate-y-[1.6em] shadow-glow"
                    : "enabled:hover:z-20 enabled:hover:-translate-y-[0.9em] enabled:focus-visible:-translate-y-[0.9em]",
                  // Opaque dimming: overlapping cards must not show through each other.
                  myTurn && !playable && "brightness-75 saturate-50"
                )}
                style={{
                  marginLeft: index === 0 ? 0 : `-${overlap}em`,
                  rotate: `${offset * tilt}deg`,
                  // The outer cards sit a little lower, so the fan curves.
                  top: `${Math.min(1.2, Math.abs(offset) * Math.abs(offset) * 0.02 * tilt)}em`
                }}
              >
                <PlayingCard card={card} size="hand" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
