// The top card of the discard pile, with a ring in the color chosen by Color Change and a bouncing
// badge while a +2 penalty is pending.

import type { Card, CardColor } from "@wildhand/shared";
import clsx from "clsx";
import { memo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { PlayingCard } from "../../../components/PlayingCard";
import { useCardLabel } from "../../../hooks/useCardLabel";
import type { DiscardFlight } from "../hooks/useDiscardFlight";

const RING_CLASSES: Record<CardColor, string> = {
  red: "ring-card-red",
  yellow: "ring-card-yellow",
  green: "ring-card-green",
  blue: "ring-card-blue"
};

interface DiscardPileProps {
  topCard: Card;
  activeColor: CardColor | null;
  pendingPenalty: number;
  /** Where the top card flies in from; `null` for the starting card. */
  flight: DiscardFlight | null;
}

export const DiscardPile = memo(function DiscardPile({ topCard, activeColor, pendingPenalty, flight }: DiscardPileProps) {
  const { t } = useTranslation("game");
  const cardLabel = useCardLabel();

  return (
    <div className="relative z-10 flex flex-col items-center">
      <span
        className={clsx(
          "rounded-[1.1em] text-[11px] sm:text-[13px] lg:text-[15px]",
          activeColor && ["p-[0.3em] ring-[0.35em]", RING_CLASSES[activeColor]]
        )}
      >
        {/* A new key for every top card restarts the animation. */}
        <span
          key={topCard.id}
          className={clsx(
            "block",
            flight && "animate-card-land",
            // On phones the opponents are a strip above the table.
            flight?.fromOpponent && "max-md:[--flight-x:0]! max-md:[--flight-y:-55]!"
          )}
          style={flight ? ({ "--flight-x": flight.x, "--flight-y": flight.y } as CSSProperties) : undefined}
        >
          <PlayingCard card={topCard} size="hand" className="-rotate-3" />
        </span>
      </span>
      {pendingPenalty > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-4 -right-4 z-10 animate-penalty-bounce rounded-full bg-danger px-3 py-1 text-xl font-bold text-ink shadow-panel ring-4 ring-white"
        >
          +{pendingPenalty}
        </span>
      )}
      <p className="sr-only">{t("table.topCard", { card: cardLabel(topCard) })}</p>
    </div>
  );
}, sameDiscardPile);

/** New states bring new objects for the same top card and flight; only a changed value counts. */
function sameDiscardPile(previous: DiscardPileProps, next: DiscardPileProps): boolean {
  return (
    previous.topCard.id === next.topCard.id &&
    previous.activeColor === next.activeColor &&
    previous.pendingPenalty === next.pendingPenalty &&
    previous.flight?.x === next.flight?.x &&
    previous.flight?.y === next.flight?.y &&
    previous.flight?.fromOpponent === next.flight?.fromOpponent
  );
}
