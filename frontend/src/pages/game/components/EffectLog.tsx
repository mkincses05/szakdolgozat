import type { MatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useEffectLog } from "../hooks/useEffectLog";
import { useLogEntryText } from "../hooks/useLogEntryText";

export function EffectLog({ view }: { view: MatchView }) {
  const { t } = useTranslation("game");
  const items = useEffectLog();
  const text = useLogEntryText(view);

  return (
    <section>
      <h2>{t("effects.title")}</h2>
      <ul className="list-disc pl-6">
        {items.map((item) => (
          <li key={item.id}>{text(item.entry)}</li>
        ))}
      </ul>
    </section>
  );
}
