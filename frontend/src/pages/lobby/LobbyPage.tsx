import { useTranslation } from "react-i18next";

export function LobbyPage() {
  const { t } = useTranslation("lobby");

  return <h1>{t("title")}</h1>;
}
