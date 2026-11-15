import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";

export function LanguageSelect() {
  const { t, i18n } = useTranslation();

  return (
    <label className="relative inline-flex w-fit items-center rounded-full bg-white text-ink-dark shadow-button">
      <span className="sr-only">{t("common:language")}</span>
      {/* A globe in front of the language names. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 size-5 stroke-brand"
        fill="none"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
      </svg>
      <select
        className="min-h-11 cursor-pointer appearance-none rounded-full bg-transparent py-2 pr-9 pl-10 font-semibold focus-visible:outline-4 focus-visible:outline-accent"
        value={i18n.resolvedLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(`common:languages.${language}`)}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 size-4 stroke-ink-soft"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
