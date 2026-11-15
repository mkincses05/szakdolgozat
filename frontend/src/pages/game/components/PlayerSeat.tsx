// One player at the table: avatar, name, hand size, and status. The player on turn gets a glowing
// ring and the countdown. While a Swap or Spy target is chosen, a valid target (from
// `getValidTargets`) becomes a button named after the player.

import type { PublicPlayerView } from "@wildhand/shared";
import clsx from "clsx";
import { memo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/Avatar";
import { CrownIcon } from "../../../components/CrownIcon";
import { usePlayerDescription } from "../hooks/usePlayerDescription";
import { CountdownRing } from "./CountdownRing";
import { MiniFan } from "./MiniFan";

export interface SeatTarget {
  selected: boolean;
  onSelect: () => void;
}

interface PlayerSeatProps {
  player: PublicPlayerView;
  isYou: boolean;
  isCurrent: boolean;
  turnDeadline: number | null;
  serverTime: number;
  compact?: boolean;
  /** Set while a target is chosen: `null` for players who cannot be chosen. */
  target?: SeatTarget | null;
  className?: string;
  style?: CSSProperties;
}

export const PlayerSeat = memo(function PlayerSeat({
  player,
  isYou,
  isCurrent,
  turnDeadline,
  serverTime,
  compact = false,
  target,
  className,
  style
}: PlayerSeatProps) {
  const describe = usePlayerDescription();
  const out = player.matchStatus !== "active" || player.presence !== "connected";
  const choosing = target !== undefined;

  const content = (
    <>
      <span className="relative">
        {isCurrent && (
          <span aria-hidden="true" className="absolute -inset-1 animate-turn-pulse rounded-full ring-4 ring-accent" />
        )}
        <Avatar
          userId={player.userId}
          isBot={player.isBot}
          size={compact ? "sm" : "md"}
          crown={player.finishPosition === 1}
          dimmed={out}
          className={clsx(target?.selected && "ring-4 ring-accent rounded-full")}
        />
        {isCurrent && <CountdownRing deadline={turnDeadline} serverTime={serverTime} />}
        <span
          aria-hidden="true"
          className="absolute -right-2 -bottom-1 min-w-7 rounded-full bg-surface px-1.5 text-center text-sm leading-6 font-bold text-ink ring-2 ring-white"
        >
          {player.handSize}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={clsx(
          "max-w-full truncate rounded-full px-3 py-0.5 font-semibold shadow-md",
          compact ? "text-xs" : "text-sm",
          isCurrent ? "bg-accent text-ink-dark" : "bg-surface/90 text-ink"
        )}
      >
        {player.displayName}
      </span>

      <StatusChip player={player} />
      {!compact && <MiniFan count={player.handSize} className="hidden md:flex" />}
      <span className="sr-only">{describe(player, isYou, isCurrent)}</span>
    </>
  );

  const layout = clsx(
    "flex shrink-0 flex-col items-center gap-1 text-center",
    compact ? "w-20" : "w-24 md:w-28",
    className
  );

  return (
    <li className={layout} style={style} data-seat-id={player.userId}>
      {target ? (
        <button
          type="button"
          aria-label={player.displayName}
          aria-pressed={target.selected}
          className="relative isolate flex w-full cursor-pointer flex-col items-center gap-1 rounded-3xl p-1 transition-transform hover:scale-105 focus-visible:outline-4 focus-visible:outline-accent active:scale-95"
          onClick={target.onSelect}
        >
          <span aria-hidden="true" className="absolute -inset-1 -z-10 rounded-3xl bg-accent/35 shadow-glow" />
          {content}
        </button>
      ) : (
        <div className={clsx("flex w-full flex-col items-center gap-1", choosing && "opacity-50")}>{content}</div>
      )}
    </li>
  );
});

/** Finished place, forfeit, or a lost connection; the full text is in the screen reader description. */
function StatusChip({ player }: { player: PublicPlayerView }) {
  const { t } = useTranslation("game");

  if (player.matchStatus === "finished") {
    return (
      <span aria-hidden="true" className="flex items-center gap-1 rounded-full bg-accent-light px-2 text-xs font-bold text-ink-dark">
        <CrownIcon className="w-3.5" />
        {player.finishPosition}.
      </span>
    );
  }
  if (player.matchStatus === "forfeited") {
    return (
      <span aria-hidden="true" className="rounded-full bg-ink-dark/60 px-2 text-xs font-semibold text-ink">
        {t("players.forfeited")}
      </span>
    );
  }
  if (player.presence !== "connected") {
    return (
      <span aria-hidden="true" className="rounded-full bg-warning px-2 text-xs font-semibold text-ink-dark">
        {t(`common:presence.${player.presence}`)}
      </span>
    );
  }
  return null;
}
