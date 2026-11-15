import type { Standing } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/Avatar";

interface ResultHeroProps {
  /** The viewer's own standing; `null` for a spectator who did not play. */
  mine: Standing | null;
}

/** The viewer's own result, read from the standings: a calm victory or defeat banner. */
export function ResultHero({ mine }: ResultHeroProps) {
  const { t } = useTranslation("results");

  if (!mine) {
    return null;
  }
  const won = mine.position === 1;
  const forfeited = mine.matchStatus === "forfeited";

  return (
    <section
      className={clsx(
        "flex animate-pop-in flex-col items-center gap-3 rounded-panel px-6 pt-10 pb-6 text-center shadow-panel sm:flex-row sm:pt-6 sm:text-left",
        won ? "bg-linear-to-br from-accent-light via-accent to-accent-dark text-ink-dark" : "bg-surface text-ink"
      )}
    >
      {/* The viewer is always a human player. */}
      <Avatar userId={mine.userId} isBot={false} size="lg" crown={won} dimmed={forfeited} className="sm:mt-4" />
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-bold sm:text-4xl">
          {won ? t("hero.victory") : forfeited ? t("hero.forfeited") : t("hero.place", { position: mine.position })}
        </p>
        {!won && <p className="text-ink-muted">{t("hero.goodGame")}</p>}
      </div>
    </section>
  );
}
