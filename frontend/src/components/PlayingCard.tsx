// The face of a card. It is an image named after the card ("Red 7", "Storm"), so a button around it
// gets the card's name; the visible symbols are decorative.

import { isNumberCard, isWildCard, type Card, type CardColor } from "@wildhand/shared";
import clsx from "clsx";
import { memo } from "react";
import { useCardLabel } from "../hooks/useCardLabel";
import { CardIcon } from "./CardIcon";
import { CARD_FRAME_CLASSES, CARD_SIZE_CLASSES, type CardSize } from "./cardFrame";

const FACE_CLASSES: Record<CardColor | "wild", string> = {
  red: "from-card-red-light via-card-red to-card-red-dark",
  yellow: "from-card-yellow-light via-card-yellow to-card-yellow-dark",
  green: "from-card-green-light via-card-green to-card-green-dark",
  blue: "from-card-blue-light via-card-blue to-card-blue-dark",
  wild: "from-card-wild-light via-card-wild to-card-wild-dark"
};

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  className?: string;
}

export const PlayingCard = memo(function PlayingCard({ card, size = "md", className }: PlayingCardProps) {
  const cardLabel = useCardLabel();
  const wild = isWildCard(card);

  return (
    <span
      role="img"
      aria-label={cardLabel(card)}
      className={clsx(
        CARD_FRAME_CLASSES,
        CARD_SIZE_CLASSES[size],
        "bg-linear-to-br",
        FACE_CLASSES[wild ? "wild" : card.color],
        className
      )}
    >
      {/* A soft sheen across the upper half gives the card some depth. */}
      <span aria-hidden="true" className="absolute -inset-x-1/2 -top-1/4 h-1/2 -rotate-12 bg-white/20" />

      <Corner card={card} className="left-[0.3em] top-[0.15em]" />
      <Corner card={card} className="right-[0.3em] bottom-[0.15em] rotate-180" />

      <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
        {wild ? (
          <span className="grid size-[3.9em] place-items-center rounded-full bg-(image:--gradient-rainbow-conic) p-[0.28em] shadow-lg">
            <span className="grid size-full place-items-center rounded-full bg-card-wild-dark text-white">
              <CardIcon kind={card.kind} className="size-[2.3em]" />
            </span>
          </span>
        ) : (
          <span className="grid size-[3.9em] place-items-center rounded-full bg-white/25 ring-[0.18em] ring-white/80">
            <Symbol card={card} large />
          </span>
        )}
      </span>
    </span>
  );
});

function Corner({ card, className }: { card: Card; className: string }) {
  return (
    <span aria-hidden="true" className={clsx("absolute leading-none", className)}>
      <Symbol card={card} />
    </span>
  );
}

/** The number, "+2", or the icon of the card; 6 and 9 are underlined so they can be told apart. */
function Symbol({ card, large = false }: { card: Card; large?: boolean }) {
  if (isNumberCard(card)) {
    return (
      <span
        className={clsx(
          "font-bold leading-none text-white text-shadow-md",
          large ? "text-[2.9em]" : "text-[1.5em]",
          (card.number === 6 || card.number === 9) && "underline decoration-[0.08em] underline-offset-[0.1em]"
        )}
      >
        {card.number}
      </span>
    );
  }
  if (card.kind === "plus2") {
    return (
      <span className={clsx("font-bold leading-none text-white text-shadow-md", large ? "text-[2.2em]" : "text-[1.2em]")}>
        +2
      </span>
    );
  }
  return <CardIcon kind={card.kind} className={clsx("text-white", large ? "size-[2.4em]" : "size-[1.4em]")} />;
}
