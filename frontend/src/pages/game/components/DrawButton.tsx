import type { DrawOption } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface DrawButtonProps {
  /** From `getDrawOption`; `null` when drawing is not possible now. */
  option: DrawOption | null;
  penalty: number;
  disabled: boolean;
  onDraw: () => void;
}

export function DrawButton({ option, penalty, disabled, onDraw }: DrawButtonProps) {
  const { t } = useTranslation("game");

  if (option === null) {
    return null;
  }

  return (
    <button type="button" className="border px-2 py-1" disabled={disabled} onClick={onDraw}>
      {t(`actions.${option}`, { count: penalty })}
    </button>
  );
}
