import type { PublicPlayerView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface TargetPickerProps {
  /** From `getValidTargets`. */
  targets: PublicPlayerView[];
  value: string | undefined;
  onChange: (userId: string) => void;
}

export function TargetPicker({ targets, value, onChange }: TargetPickerProps) {
  const { t } = useTranslation("game");

  return (
    <fieldset className="flex flex-wrap gap-2 border p-2">
      <legend>{t("options.target")}</legend>
      {targets.map((player) => (
        <button
          key={player.userId}
          type="button"
          className="border px-2 py-1 aria-pressed:font-bold"
          aria-pressed={value === player.userId}
          onClick={() => onChange(player.userId)}
        >
          {player.displayName}
        </button>
      ))}
    </fieldset>
  );
}
