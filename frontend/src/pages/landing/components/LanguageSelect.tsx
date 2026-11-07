import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../../../i18n";

export function LanguageSelect() {
  const { t, i18n } = useTranslation("landing");

  return (
    <label className="flex flex-col gap-1">
      {t("language")}
      <select
        className="border p-1"
        value={i18n.resolvedLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(`common:languages.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
