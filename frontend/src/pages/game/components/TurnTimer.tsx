import { useTranslation } from "react-i18next";
import { useCountdown } from "../hooks/useCountdown";

/** Seconds left in the turn. Its own component, so the tick re-renders only this text. */
export function TurnTimer({ deadline, serverTime }: { deadline: number | null; serverTime: number }) {
  const { t } = useTranslation("game");
  const secondsLeft = useCountdown(deadline, serverTime);

  if (secondsLeft === null) {
    return null;
  }
  return (
    <span className="rounded-full bg-surface-sunken/30 px-2 py-0.5 text-sm tabular-nums">
      {t("turn.timeLeft", { seconds: secondsLeft })}
    </span>
  );
}
