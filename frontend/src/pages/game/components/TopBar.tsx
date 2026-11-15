import type { MatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import type { LogItem } from "../hooks/useEffectLog";
import { EffectLog } from "./EffectLog";
import { SettingsMenu } from "./SettingsMenu";
import { TurnBanner } from "./TurnBanner";

interface TopBarProps {
  view: MatchView;
  userId: string;
  roomCode: string | null;
  forfeits: boolean;
  events: LogItem[];
}

/** The room, whose turn it is, the events, and the settings. */
export function TopBar({ view, userId, roomCode, forfeits, events }: TopBarProps) {
  const { t } = useTranslation("game");

  return (
    <header className="relative z-20 flex items-center justify-between gap-2 px-3 pt-3 md:px-5">
      <h1 className="sr-only">{t("title")}</h1>
      <p className="hidden min-w-11 shrink-0 sm:block">
        {roomCode && (
          <span className="block rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-panel">
            {t("topBar.room", { code: roomCode })}
          </span>
        )}
      </p>
      <TurnBanner view={view} userId={userId} />
      <div className="flex shrink-0 items-center gap-2">
        <EffectLog view={view} items={events} />
        <SettingsMenu forfeits={forfeits} />
      </div>
    </header>
  );
}
