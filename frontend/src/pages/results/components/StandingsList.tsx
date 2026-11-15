// The final standings from the server: the first three on a podium, everybody else below. Nothing is
// computed here; players of a blocked game share a position (R18) and stand on the same step.

import type { BotLevel, Standing } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/Avatar";
import { useStandingLabel } from "../hooks/useStandingLabel";

const PODIUM_SIZE = 3;

/** The winner stands in the middle, the second on the left, the third on the right. */
const PODIUM_ORDER = ["order-2", "order-1", "order-3"];

function stepClasses(position: number): string {
  if (position === 1) return "h-28 bg-linear-to-b from-accent-light to-accent sm:h-32";
  if (position === 2) return "h-20 bg-linear-to-b from-white to-silver sm:h-24";
  if (position === 3) return "h-14 bg-linear-to-b from-accent-light/60 to-bronze sm:h-16";
  return "h-10 bg-ink-dark/10";
}

interface StandingsListProps {
  /** Ordered by position. */
  standings: Standing[];
  userId: string;
  nameOf: (userId: string) => string;
  botLevelOf: (userId: string) => BotLevel | null;
}

export function StandingsList({ standings, userId, nameOf, botLevelOf }: StandingsListProps) {
  const { t } = useTranslation("results");
  const label = useStandingLabel(userId, nameOf, botLevelOf);
  const podium = standings.slice(0, PODIUM_SIZE);
  const rest = standings.slice(PODIUM_SIZE);

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-bold">{t("standings")}</h2>

      <ol className="flex items-end justify-center gap-2 sm:gap-4">
        {podium.map((standing, index) => {
          const forfeited = standing.matchStatus === "forfeited";
          return (
            <li
              key={standing.userId}
              className={clsx("flex w-1/3 max-w-44 animate-card-enter flex-col items-center gap-2", PODIUM_ORDER[index])}
            >
              <Avatar
                userId={standing.userId}
                isBot={botLevelOf(standing.userId) !== null}
                size={standing.position === 1 ? "lg" : "md"}
                crown={standing.position === 1}
                dimmed={forfeited}
                className={clsx(standing.userId === userId && "rounded-full ring-4 ring-accent")}
              />
              <span className="min-h-12 text-center text-sm font-semibold sm:text-base">{label(standing)}</span>
              {/* The big number is CSS content, so it is not repeated in the text of the item. */}
              <span
                aria-hidden="true"
                data-position={standing.position}
                className={clsx(
                  "grid w-full place-items-center rounded-t-3xl text-4xl font-bold text-ink-dark/70 shadow-card",
                  "before:content-[attr(data-position)]",
                  stepClasses(standing.position)
                )}
              />
            </li>
          );
        })}
      </ol>

      {rest.length > 0 && (
        <ol className="flex flex-col gap-2">
          {rest.map((standing) => (
            <li
              key={standing.userId}
              className={clsx(
                "flex items-center gap-3 rounded-2xl bg-ink-dark/5 px-3 py-2 font-semibold",
                standing.userId === userId && "ring-4 ring-accent"
              )}
            >
              <Avatar
                userId={standing.userId}
                isBot={botLevelOf(standing.userId) !== null}
                size="sm"
                dimmed={standing.matchStatus === "forfeited"}
              />
              {label(standing)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
