// The oval card table with the rainbow rim: the draw pile and the discard pile in the middle, the
// chosen color and the pending penalty below them. On phones it is a rounded rectangle. A Storm
// shakes the table and lights it up.

import type { MatchView } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { CARD_COLOR_BG_CLASSES } from "../../../components/cardFrame";
import { Logo } from "../../../components/Logo";
import { useDiscardOrigin } from "../hooks/useDiscardOrigin";
import { DirectionArrows } from "./DirectionArrows";
import { DiscardPile } from "./DiscardPile";
import { DrawPile, type DrawControl } from "./DrawPile";

interface GameTableProps {
  view: MatchView;
  /** `null` for spectators. */
  draw: DrawControl | null;
  userId: string;
  /** Set while the toast of a Storm is shown, so that the table shakes once. */
  stormKey: number | null;
}

export function GameTable({ view, draw, userId, stormKey }: GameTableProps) {
  const { t } = useTranslation("game");
  const origin = useDiscardOrigin(view.topCard.id, view.currentPlayerId);

  return (
    <section
      className={clsx(
        "relative min-h-0 flex-1 rounded-[2.5rem] bg-(image:--gradient-rainbow-conic) p-2 shadow-panel md:absolute md:inset-x-[8%] md:inset-y-[13%] md:rounded-[50%] md:p-3",
        stormKey !== null && "animate-storm-shake"
      )}
    >
      <div className="relative grid h-full place-items-center rounded-[2rem] bg-radial from-table-light via-table to-table-dark inset-shadow-felt md:rounded-[50%]">
        <DirectionArrows />
        {stormKey !== null && (
          <span
            key={stormKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-storm-flash rounded-[inherit] bg-radial from-white via-accent-light/60 to-transparent"
          />
        )}
        <div className="relative flex flex-col items-center gap-2 py-3 md:gap-3">
          <Logo className="text-xl opacity-90 sm:text-2xl lg:text-4xl" />
          <div className="flex items-end gap-6 sm:gap-10">
            <DrawPile size={view.drawPileSize} control={draw} />
            <DiscardPile
              topCard={view.topCard}
              activeColor={view.activeColor}
              pendingPenalty={view.pendingPenalty}
              originUserId={origin}
              playedByMe={origin === userId}
            />
          </div>
          <div className="flex min-h-7 flex-wrap justify-center gap-2 text-sm font-semibold">
            {view.activeColor && (
              <p className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink-dark shadow-md">
                <span aria-hidden="true" className={`size-3 rounded-full ${CARD_COLOR_BG_CLASSES[view.activeColor]}`} />
                {t("table.activeColor", { color: t(`common:colors.${view.activeColor}`) })}
              </p>
            )}
            {view.pendingPenalty > 0 && (
              <p className="rounded-full bg-danger px-3 py-1 text-ink shadow-md">
                {t("table.penalty", { count: view.pendingPenalty })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
