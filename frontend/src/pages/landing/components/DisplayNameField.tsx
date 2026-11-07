import { DISPLAY_NAME_MAX_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface DisplayNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function DisplayNameField({ value, onChange }: DisplayNameFieldProps) {
  const { t } = useTranslation("landing");

  return (
    <label className="flex flex-col gap-1">
      {t("displayName")}
      <input
        className="border p-1"
        value={value}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoComplete="nickname"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
