import type { Card } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useCardLabel } from "../hooks/useCardLabel";

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

export function SwapPicker({
  offers,
  targetHandSize,
  swapCardId,
  position,
  onSwapCardChange,
  onPositionChange
}: SwapPickerProps) {
  const { t } = useTranslation("game");
  const cardLabel = useCardLabel();

  return (
    <>
      <fieldset className="flex flex-wrap gap-2 border p-2">
        <legend>{t("options.give")}</legend>
        {offers.map((card) => (
          <button
            key={card.id}
            type="button"
            className="border px-2 py-1 aria-pressed:font-bold"
            aria-pressed={swapCardId === card.id}
            onClick={() => onSwapCardChange(card.id)}
          >
            {cardLabel(card)}
          </button>
        ))}
      </fieldset>

      {targetHandSize !== null && (
        <fieldset className="flex flex-wrap gap-2 border p-2">
          <legend>{t("options.take")}</legend>
          {Array.from({ length: targetHandSize }, (_, index) => (
            <button
              key={index}
              type="button"
              className="border px-2 py-1 aria-pressed:font-bold"
              aria-pressed={position === index}
              onClick={() => onPositionChange(index)}
            >
              {t("options.faceDownCard", { number: index + 1 })}
            </button>
          ))}
        </fieldset>
      )}
    </>
  );
}
