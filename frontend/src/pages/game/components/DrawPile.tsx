// The draw pile. When the shared `getDrawOption` allows drawing, the pile itself is the button
// (draw a card, draw the +2 penalty, or pass at the hand limit) and glows.

import type { DrawOption } from "@wildhand/shared";
import clsx from "clsx";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { CardBack } from "../../../components/CardBack";

export interface DrawControl {
  /** From `getDrawOption`; `null` when drawing is not possible now. */
  option: DrawOption | null;
  penalty: number;
  disabled: boolean;
  onDraw: () => void;
}

interface DrawPileProps {
  size: number;
  /** `null` for spectators. */
  control: DrawControl | null;
}

// Memoized: `control` keeps its identity while nothing about drawing changes.
export const DrawPile = memo(function DrawPile({ size, control }: DrawPileProps) {
  const { t } = useTranslation("game");
  // A few backs show the height of the pile; the exact number is in the badge.
  const layers = Math.min(3, Math.ceil(size / 25));
  const option = control?.option ?? null;

  const stack = (
    <span aria-hidden="true" className="relative block text-[11px] sm:text-[13px] lg:text-[15px]">
      <span className="relative block h-[8.4em] w-[5.6em]">
        {Array.from({ length: Math.max(layers, 1) }, (_, index) => (
          <CardBack
            key={index}
            size="hand"
            className={clsx("absolute! left-0", size === 0 && "opacity-30")}
            style={{ top: `${-index * 0.25}em`, left: `${-index * 0.2}em` }}
          />
        ))}
      </span>
      <span className="absolute -top-3 -right-3 z-10 min-w-8 rounded-full bg-surface px-2 text-center text-sm leading-7 font-bold text-ink ring-2 ring-white">
        {size}
      </span>
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {option !== null && control ? (
        <button
          type="button"
          disabled={control.disabled}
          onClick={control.onDraw}
          className="group flex cursor-pointer flex-col items-center gap-2 rounded-card transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-95 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="rounded-card shadow-glow">{stack}</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-ink-dark shadow-button">
            {t(`actions.${option}`, { count: control.penalty })}
          </span>
        </button>
      ) : (
        stack
      )}
      <p className="sr-only">{t("table.drawPile", { count: size })}</p>
    </div>
  );
});
