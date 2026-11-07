import type { Standing } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface StandingsListProps {
  /** Ordered by position; players of a blocked game share a position (R18). */
  standings: Standing[];
  userId: string;
  nameOf: (userId: string) => string;
}

export function StandingsList({ standings, userId, nameOf }: StandingsListProps) {
  const { t } = useTranslation("results");

  return (
    <section>
      <h2>{t("standings")}</h2>
      <ul>
        {standings.map((standing) => (
          <li key={standing.userId}>
            {t("place", { position: standing.position, name: nameOf(standing.userId) })}
            {standing.userId === userId && ` (${t("you")})`}
            {standing.matchStatus === "forfeited" && ` – ${t("forfeited")}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
