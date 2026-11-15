// The text of one standing, for example "1. Bela (bot, heuristic)" or "2. Anna (you) – forfeited".

import type { BotLevel, Standing } from "@wildhand/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBotLabel } from "../../../hooks/useBotLabel";

export function useStandingLabel(
  userId: string,
  nameOf: (userId: string) => string,
  botLevelOf: (userId: string) => BotLevel | null
): (standing: Standing) => string {
  const { t } = useTranslation("results");
  const botLabel = useBotLabel();

  return useCallback(
    (standing: Standing) => {
      const botLevel = botLevelOf(standing.userId);
      return [
        t("place", { position: standing.position, name: nameOf(standing.userId) }),
        botLevel !== null && ` (${botLabel(botLevel)})`,
        standing.userId === userId && ` (${t("you")})`,
        standing.matchStatus === "forfeited" && ` – ${t("forfeited")}`
      ]
        .filter(Boolean)
        .join("");
    },
    [t, botLabel, userId, nameOf, botLevelOf]
  );
}
