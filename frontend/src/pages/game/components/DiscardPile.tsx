// The top card of the discard pile, with a ring in the color chosen by Color Change and a bouncing
// badge while a +2 penalty is pending.

import type { Card, CardColor } from "@wildhand/shared";
import clsx from "clsx";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { PlayingCard } from "../../../components/PlayingCard";
import { useCardLabel } from "../../../hooks/useCardLabel";
import { useLandingOffset } from "../hooks/useLandingOffset";

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
  /** The player who played the top card, `null` for the starting card. */
  originUserId: string | null;
  /** The viewer played it: the card flies in from the own hand. */
  playedByMe: boolean;
}

export function DiscardPile({ topCard, activeColor, pendingPenalty, originUserId, playedByMe }: DiscardPileProps) {
  const { t } = useTranslation("game");
  const cardLabel = useCardLabel();
  const landing = useLandingOffset(topCard.id, originUserId, playedByMe);

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
          ref={landing.ref}
          className={clsx("block", landing.offset && "animate-card-land")}
          style={
            landing.offset
              ? ({ "--from-x": `${landing.offset.x}px`, "--from-y": `${landing.offset.y}px` } as CSSProperties)
              : undefined
          }
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
}
