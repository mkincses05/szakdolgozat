import type { MatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import type { LogItem } from "../hooks/useEffectLog";
import { useLogEntryText } from "../hooks/useLogEntryText";
import { Dialog } from "./Dialog";

interface EffectLogDrawerProps {
  view: MatchView;
  items: LogItem[];
  onClose: () => void;
}

/** The latest events, newest first, in a drawer. */
export function EffectLogDrawer({ view, items, onClose }: EffectLogDrawerProps) {
  const { t } = useTranslation("game");
  const text = useLogEntryText(view);

  return (
    <Dialog title={t("effects.title")} placement="side" onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {items.length === 0 && <li className="text-ink-soft">{t("effects.empty")}</li>}
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl bg-ink-dark/5 px-4 py-2">
            {text(item.entry)}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
