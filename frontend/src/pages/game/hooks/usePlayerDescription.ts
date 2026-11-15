// The full text description of a seat for screen readers, for example
// "Bela (bot, heuristic): 1 card – disconnected – on turn".

import type { PublicPlayerView } from "@wildhand/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBotLabel } from "../../../hooks/useBotLabel";

export function usePlayerDescription(): (player: PublicPlayerView, isYou: boolean, isCurrent: boolean) => string {
  const { t } = useTranslation("game");
  const botLabel = useBotLabel();

  return useCallback(
    (player: PublicPlayerView, isYou: boolean, isCurrent: boolean) => {
      const name = [
        player.displayName,
        player.botLevel !== null && ` (${botLabel(player.botLevel)})`,
        isYou && ` (${t("players.you")})`
      ]
        .filter(Boolean)
        .join("");
      const details = [
        t("players.cards", { count: player.handSize }),
        player.matchStatus === "finished" && t("players.finished", { position: player.finishPosition }),
        player.matchStatus === "forfeited" && t("players.forfeited"),
        t(`common:presence.${player.presence}`),
        isCurrent && t("players.onTurn")
      ]
        .filter(Boolean)
        .join(" – ");
      return `${name}: ${details}`;
    },
    [t, botLabel]
  );
}
