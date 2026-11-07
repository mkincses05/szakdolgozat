// Translated card labels, for example "Red 7", "Blue +2", or "Storm".

import { isColoredCard, isNumberCard, type Card } from "@wildhand/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useCardLabel(): (card: Card) => string {
  const { t } = useTranslation();

  return useCallback(
    (card: Card) => {
      if (isNumberCard(card)) {
        return t("common:cardLabel.number", { color: t(`common:colors.${card.color}`), number: card.number });
      }
      const name = t(`common:cards.${card.kind}`);
      return isColoredCard(card)
        ? t("common:cardLabel.colored", { color: t(`common:colors.${card.color}`), name })
        : name;
    },
    [t]
  );
}
