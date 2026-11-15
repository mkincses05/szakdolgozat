import type { BotLevel, Standing } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/Avatar";
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
      <ul className="flex flex-col gap-2">
        {standings.map((standing) => {
          const botLevel = botLevelOf(standing.userId);
          return (
            <li key={standing.userId} className="flex items-center gap-3">
              <Avatar
                userId={standing.userId}
                isBot={botLevel !== null}
                size="sm"
                crown={standing.position === 1}
                dimmed={standing.matchStatus === "forfeited"}
              />
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
