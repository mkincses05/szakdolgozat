import { BOT_LEVELS, type BotLevel } from "@wildhand/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddBotPanelProps {
  disabled: boolean;
  onAdd: (level: BotLevel) => void;
}

export function AddBotPanel({ disabled, onAdd }: AddBotPanelProps) {
  const { t } = useTranslation("lobby");
  const [level, setLevel] = useState<BotLevel>("heuristic");

  return (
    <section className="flex flex-col gap-1">
      <h2>{t("bots.title")}</h2>
      <label className="flex gap-2">
        {t("bots.level")}
        <select className="border" value={level} onChange={(event) => setLevel(event.target.value as BotLevel)}>
          {BOT_LEVELS.map((option) => (
            <option key={option} value={option}>
              {t(`common:bots.levels.${option}`)}
            </option>
          ))}
        </select>
      </label>
      <p>{t(`bots.descriptions.${level}`)}</p>
      <button type="button" className="border px-2 py-1" disabled={disabled} onClick={() => onAdd(level)}>
        {t("bots.add")}
      </button>
    </section>
  );
}
