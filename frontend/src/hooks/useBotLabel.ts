// The translated label of a computer player, for example "bot, heuristic", used next to its name in
// the lobby, the game, and the results.

import type { BotLevel } from "@wildhand/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useBotLabel(): (level: BotLevel) => string {
  const { t } = useTranslation();

  return useCallback((level: BotLevel) => t("common:bots.tag", { level: t(`common:bots.levels.${level}`) }), [t]);
}
