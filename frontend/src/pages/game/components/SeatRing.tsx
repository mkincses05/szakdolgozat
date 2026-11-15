// The other players around the table. On phones they are a strip that scrolls sideways above the
// table; from `md` on, the same seats sit around the oval table at the positions of `seatLayout`.

import type { MatchView, PublicPlayerView } from "@wildhand/shared";
import clsx from "clsx";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { SeatPlacement } from "../hooks/useSeatLayout";
import { PlayerSeat } from "./PlayerSeat";

export interface Targeting {
  /** From `getValidTargets`. */
  targets: PublicPlayerView[];
  selectedId: string | undefined;
  onSelect: (userId: string) => void;
}

interface SeatRingProps {
  view: MatchView;
  seats: SeatPlacement[];
  compact: boolean;
  targeting: Targeting | null;
}

export function SeatRing({ view, seats, compact, targeting }: SeatRingProps) {
  const { t } = useTranslation("game");

  return (
    <ul
      aria-label={t("players.title")}
      className={clsx(
        "relative z-10 order-first flex shrink-0 gap-1 overflow-x-auto px-1 pt-3 pb-1",
        "md:pointer-events-none md:absolute md:inset-0 md:block md:overflow-visible md:p-0"
      )}
    >
      {seats.map(({ player, x, y }) => {
        const valid = targeting?.targets.some((target) => target.userId === player.userId) ?? false;
        return (
          <PlayerSeat
            key={player.userId}
            player={player}
            isYou={false}
            isCurrent={player.userId === view.currentPlayerId}
            turnDeadline={view.turnDeadline}
            serverTime={view.serverTime}
            compact={compact}
            target={
              targeting === null
                ? undefined
                : valid
                  ? {
                      selected: targeting.selectedId === player.userId,
                      onSelect: () => targeting.onSelect(player.userId)
                    }
                  : null
            }
            className="md:pointer-events-auto md:absolute md:top-(--seat-y) md:left-(--seat-x) md:-translate-x-1/2 md:-translate-y-1/2"
            style={{ "--seat-x": `${x}%`, "--seat-y": `${y}%` } as CSSProperties}
          />
        );
      })}
    </ul>
  );
}
