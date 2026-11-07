// Translated text of an effect log entry; player names come from the latest match view.

import type { Card, MatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import type { LogEntry } from "./useEffectLog";
import { useCardLabel } from "./useCardLabel";

export function useLogEntryText(view: MatchView): (entry: LogEntry) => string {
  const { t } = useTranslation("game");
  const cardLabel = useCardLabel();

  const name = (userId: string) => view.players.find((player) => player.userId === userId)?.displayName ?? "";
  const cards = (list: Card[]) => list.map(cardLabel).join(", ");

  return (entry) => {
    if (entry.type === "spyReveal") {
      return t("effects.spyReveal", { name: name(entry.reveal.targetPlayerId), cards: cards(entry.reveal.hand) });
    }
    if (entry.type === "swapResult") {
      const { otherPlayerId, given, received } = entry.result;
      return t("effects.swapResult", { name: name(otherPlayerId), given: cardLabel(given), received: cardLabel(received) });
    }

    const effect = entry.effect;
    switch (effect.type) {
      case "cardsPlayed":
        return effect.chosenColor
          ? t("effects.cardsPlayedWithColor", {
              name: name(effect.userId),
              cards: cards(effect.cards),
              color: t(`common:colors.${effect.chosenColor}`)
            })
          : t("effects.cardsPlayed", { name: name(effect.userId), cards: cards(effect.cards) });
      case "cardDrawn":
        return effect.draw.actual > 0
          ? t("effects.cardDrawn", { name: name(effect.draw.userId), count: effect.draw.actual })
          : t("effects.cardDrawnBlocked", { name: name(effect.draw.userId) });
      case "passed":
        return t("effects.passed", { name: name(effect.userId) });
      case "penaltyDrawn":
        return t("effects.penaltyDrawn", {
          name: name(effect.draw.userId),
          actual: effect.draw.actual,
          requested: effect.draw.requested
        });
      case "storm":
        return t("effects.storm", {
          name: name(effect.stormPlayerId),
          value: effect.value,
          draws: effect.draws
            .map((draw) => t("effects.drawAmount", { name: name(draw.userId), actual: draw.actual, requested: draw.requested }))
            .join(", ")
        });
      case "swap":
        return t(effect.exchanged ? "effects.swap" : "effects.swapSkipped", {
          actor: name(effect.actorId),
          target: name(effect.targetId)
        });
      case "spy":
        return t("effects.spy", { actor: name(effect.actorId), target: name(effect.targetId) });
      case "reshuffle":
        return t(effect.deckAdded ? "effects.reshuffleWithDeck" : "effects.reshuffle");
      case "playerFinished":
        return t("effects.playerFinished", { name: name(effect.userId), position: effect.position });
      case "playerForfeited":
        return t("effects.playerForfeited", { name: name(effect.userId) });
    }
  };
}
