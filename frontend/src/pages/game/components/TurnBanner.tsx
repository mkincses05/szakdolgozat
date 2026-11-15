import type { MatchView } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { TurnTimer } from "./TurnTimer";

/** Whose turn it is. It pops in again whenever the turn passes to another player. */
export function TurnBanner({ view, userId }: { view: MatchView; userId: string }) {
  const { t } = useTranslation("game");
  const current = view.players.find((player) => player.userId === view.currentPlayerId);

  if (!current) {
    return null;
  }
  const mine = current.userId === userId;

  return (
    <div
      key={current.userId}
      className={clsx(
        "flex min-w-0 animate-pop-in flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full px-4 py-1.5 text-center font-bold shadow-panel",
        mine ? "bg-accent text-ink-dark ring-4 ring-white" : "bg-surface text-ink"
      )}
    >
      <p className="truncate">{mine ? t("turn.yours") : t("turn.other", { name: current.displayName })}</p>
      <TurnTimer deadline={view.turnDeadline} serverTime={view.serverTime} />
    </div>
  );
}
