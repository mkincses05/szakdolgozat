// i18n setup (en, hu, de) with namespaces. `common` holds texts used on several pages (shared
// buttons, server error codes, connection messages); every page has its own namespace, named after
// its folder in `src/pages/`. Every user-facing text comes from these resources.

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import commonDe from "./locales/de.json";
import commonEn from "./locales/en.json";
import commonHu from "./locales/hu.json";

export const SUPPORTED_LANGUAGES = ["en", "hu", "de"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const COMMON_NAMESPACE = "common";

type Translations = Record<string, unknown>;

/** `src/pages/<page>/locales/<language>.json`, collected automatically. */
const pageLocales = import.meta.glob<Translations>("../pages/*/locales/*.json", { eager: true, import: "default" });

function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function buildResources(): Record<Language, Record<string, Translations>> {
  const result: Record<Language, Record<string, Translations>> = {
    en: { [COMMON_NAMESPACE]: commonEn },
    hu: { [COMMON_NAMESPACE]: commonHu },
    de: { [COMMON_NAMESPACE]: commonDe }
  };

  for (const [path, translations] of Object.entries(pageLocales)) {
    const [, page, language] = /\/pages\/([^/]+)\/locales\/([^/]+)\.json$/.exec(path) ?? [];
    if (!page || !language || !isLanguage(language)) {
      throw new Error(`Unexpected translation file: ${path}`);
    }
    result[language][page] = translations;
  }

  return result;
}

export const resources = buildResources();
export const NAMESPACES = [...new Set(Object.values(resources).flatMap((namespaces) => Object.keys(namespaces)))];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES,
    defaultNS: COMMON_NAMESPACE,
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] }
  });

export default i18n;
