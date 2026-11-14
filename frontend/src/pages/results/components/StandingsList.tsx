import type { BotLevel, Standing } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useBotLabel } from "../../../hooks/useBotLabel";

interface StandingsListProps {
  /** Ordered by position; players of a blocked game share a position (R18). */
  standings: Standing[];
  userId: string;
  nameOf: (userId: string) => string;
  botLevelOf: (userId: string) => BotLevel | null;
}

export function StandingsList({ standings, userId, nameOf, botLevelOf }: StandingsListProps) {
  const { t } = useTranslation("results");
  const botLabel = useBotLabel();

  return (
    <section>
      <h2>{t("standings")}</h2>
      <ul>
        {standings.map((standing) => {
          const botLevel = botLevelOf(standing.userId);
          return (
            <li key={standing.userId}>
              {t("place", { position: standing.position, name: nameOf(standing.userId) })}
              {botLevel !== null && ` (${botLabel(botLevel)})`}
              {standing.userId === userId && ` (${t("you")})`}
              {standing.matchStatus === "forfeited" && ` – ${t("forfeited")}`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
