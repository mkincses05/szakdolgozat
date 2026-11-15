import type { MatchView } from "@wildhand/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LogItem } from "../hooks/useEffectLog";
import { useLogEntryText } from "../hooks/useLogEntryText";
import { Dialog } from "./Dialog";

interface EffectLogProps {
  view: MatchView;
  items: LogItem[];
}

/** The button in the top bar and the drawer with the latest events, newest first. */
export function EffectLog({ view, items }: EffectLogProps) {
  const { t } = useTranslation("game");
  const text = useLogEntryText(view);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-3 font-semibold text-ink shadow-panel ring-2 ring-white/60 transition-transform hover:scale-105 active:scale-95 sm:px-4"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
        <span className="sr-only sm:not-sr-only">{t("effects.title")}</span>
        {items.length > 0 && (
          <span aria-hidden="true" className="rounded-full bg-accent px-2 text-sm text-ink-dark">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <Dialog title={t("effects.title")} placement="side" onClose={() => setOpen(false)}>
          <ul className="flex flex-col gap-2">
            {items.length === 0 && <li className="text-ink-soft">{t("effects.empty")}</li>}
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl bg-ink-dark/5 px-4 py-2">
                {text(item.entry)}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}
