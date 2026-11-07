import { useTranslation } from "react-i18next";

export function ResultsPage() {
  const { t } = useTranslation("results");

  return <h1>{t("title")}</h1>;
}
