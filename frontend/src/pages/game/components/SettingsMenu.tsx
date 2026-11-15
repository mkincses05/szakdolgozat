import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelect } from "../../../components/LanguageSelect";
import { Dialog } from "./Dialog";
import { LeaveMatchButton } from "./LeaveMatchButton";

/**
 * The gear button and the settings it opens: the language and leaving the match. Memoized: the top
 * bar renders again on every update, the settings do not need to.
 */
export const SettingsMenu = memo(function SettingsMenu({ forfeits }: { forfeits: boolean }) {
  const { t } = useTranslation("game");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("settings.open")}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-surface text-ink shadow-panel ring-2 ring-white/60 transition-transform hover:rotate-45 active:scale-95"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
      {open && (
        <Dialog title={t("settings.title")} onClose={() => setOpen(false)}>
          <LanguageSelect />
          <LeaveMatchButton forfeits={forfeits} />
        </Dialog>
      )}
    </>
  );
});
