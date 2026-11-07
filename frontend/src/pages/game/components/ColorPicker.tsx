import { CARD_COLORS, type CardColor } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface ColorPickerProps {
  value: CardColor | undefined;
  onChange: (color: CardColor) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { t } = useTranslation("game");

  return (
    <fieldset className="flex flex-wrap gap-2 border p-2">
      <legend>{t("options.color")}</legend>
      {CARD_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="border px-2 py-1 aria-pressed:font-bold"
          aria-pressed={value === color}
          onClick={() => onChange(color)}
        >
          {t(`common:colors.${color}`)}
        </button>
      ))}
    </fieldset>
  );
}
