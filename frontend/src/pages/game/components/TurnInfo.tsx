import type { MatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useCountdown } from "../hooks/useCountdown";

interface TurnInfoProps {
  view: MatchView;
  userId: string;
}

export function TurnInfo({ view, userId }: TurnInfoProps) {
  const { t } = useTranslation("game");
  const secondsLeft = useCountdown(view.turnDeadline, view.serverTime);
  const current = view.players.find((player) => player.userId === view.currentPlayerId);

  if (!current) {
    return null;
  }

  return (
    <section>
      <p>{current.userId === userId ? t("turn.yours") : t("turn.other", { name: current.displayName })}</p>
      {secondsLeft !== null && <p>{t("turn.timeLeft", { seconds: secondsLeft })}</p>}
    </section>
  );
}
