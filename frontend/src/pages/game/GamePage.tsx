import { useTranslation } from "react-i18next";

export function GamePage() {
  const { t } = useTranslation("game");

  return <h1>{t("title")}</h1>;
}
