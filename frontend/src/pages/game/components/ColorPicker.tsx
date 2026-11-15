import { CARD_COLORS, type CardColor } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { CARD_COLOR_BG_CLASSES } from "../../../components/cardFrame";

interface ColorPickerProps {
  value: CardColor | undefined;
  onChange: (color: CardColor) => void;
}

/** Four big color orbs for Color Change. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { t } = useTranslation("game");

  return (
    <fieldset className="flex flex-col items-center gap-2">
      <legend className="mb-2 text-center font-semibold">{t("options.color")}</legend>
      <div className="flex flex-wrap justify-center gap-3">
        {CARD_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className="group flex cursor-pointer flex-col items-center gap-1 text-sm font-semibold focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className={clsx(
                "size-12 rounded-full shadow-button ring-4 ring-white transition-transform group-hover:scale-110 group-active:scale-95 sm:size-14",
                "group-focus-visible:outline-4 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent",
                "group-aria-pressed:scale-110 group-aria-pressed:ring-accent",
                CARD_COLOR_BG_CLASSES[color]
              )}
            />
            {t(`common:colors.${color}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
