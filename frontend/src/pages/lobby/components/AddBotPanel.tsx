import { BOT_LEVELS, type BotLevel } from "@wildhand/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { Panel } from "../../../components/Panel";

interface AddBotPanelProps {
  disabled: boolean;
  onAdd: (level: BotLevel) => void;
}

export function AddBotPanel({ disabled, onAdd }: AddBotPanelProps) {
  const { t } = useTranslation("lobby");
  const [level, setLevel] = useState<BotLevel>("heuristic");

  return (
    <Panel className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{t("bots.title")}</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">{t("bots.level")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {BOT_LEVELS.map((option) => (
            <Button
              key={option}
              variant="secondary"
              size="sm"
              aria-pressed={level === option}
              onClick={() => setLevel(option)}
            >
              {t(`common:bots.levels.${option}`)}
            </Button>
          ))}
        </div>
      </fieldset>
      <p className="min-h-12 text-sm text-ink-soft">{t(`bots.descriptions.${level}`)}</p>
      <Button disabled={disabled} onClick={() => onAdd(level)}>
        {t("bots.add")}
      </Button>
    </Panel>
  );
}
