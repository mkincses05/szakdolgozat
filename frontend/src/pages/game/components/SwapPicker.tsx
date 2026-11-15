import type { Card } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { CardBack } from "../../../components/CardBack";
import { PlayingCard } from "../../../components/PlayingCard";

interface SwapPickerProps {
  /** From `getSwapOffers`. */
  offers: Card[];
  /** The target's cards are shown only as face-down positions (R12). */
  targetHandSize: number | null;
  swapCardId: string | undefined;
  position: number | undefined;
  onSwapCardChange: (cardId: string) => void;
  onPositionChange: (position: number) => void;
}

const CHOICE_CLASSES = clsx(
  "cursor-pointer rounded-card transition-transform hover:-translate-y-1 active:scale-95",
  "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent",
  "aria-pressed:-translate-y-2 aria-pressed:shadow-glow"
);

export function SwapPicker({
  offers,
  targetHandSize,
  swapCardId,
  position,
  onSwapCardChange,
  onPositionChange
}: SwapPickerProps) {
  const { t } = useTranslation("game");

  return (
    <div className="flex flex-wrap justify-center gap-6">
      <fieldset className="flex flex-col items-center gap-2">
        <legend className="mb-2 text-center font-semibold">{t("options.give")}</legend>
        <div className="flex flex-wrap justify-center gap-1.5 pt-2">
          {offers.map((card) => (
            <button
              key={card.id}
              type="button"
              aria-pressed={swapCardId === card.id}
              onClick={() => onSwapCardChange(card.id)}
              className={CHOICE_CLASSES}
            >
              <PlayingCard card={card} size="sm" />
            </button>
          ))}
        </div>
      </fieldset>

      {targetHandSize !== null && (
        <fieldset className="flex flex-col items-center gap-2">
          <legend className="mb-2 text-center font-semibold">{t("options.take")}</legend>
          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
            {Array.from({ length: targetHandSize }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-pressed={position === index}
                onClick={() => onPositionChange(index)}
                className={CHOICE_CLASSES}
              >
                <CardBack size="sm" />
                <span className="sr-only">{t("options.faceDownCard", { number: index + 1 })}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
