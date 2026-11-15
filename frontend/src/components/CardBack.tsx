// The back of a card: hidden cards, the draw pile, and the loading animation. Decorative only.

import clsx from "clsx";
import { memo, type CSSProperties } from "react";
import { CARD_FRAME_CLASSES, CARD_SIZE_CLASSES, type CardSize } from "./cardFrame";
import { CrownIcon } from "./CrownIcon";

interface CardBackProps {
  size?: CardSize;
  className?: string;
  style?: CSSProperties;
}

export const CardBack = memo(function CardBack({ size = "md", className, style }: CardBackProps) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={clsx(
        CARD_FRAME_CLASSES,
        CARD_SIZE_CLASSES[size],
        "bg-linear-to-br from-card-back-light to-card-back",
        className
      )}
    >
      <span className="absolute -inset-x-1/2 top-[58%] h-[1.3em] -rotate-[28deg] bg-(image:--gradient-rainbow) opacity-90" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-[3.4em] place-items-center rounded-full bg-card-back ring-[0.18em] ring-accent">
          <CrownIcon className="w-[2.2em]" />
        </span>
      </span>
    </span>
  );
});
