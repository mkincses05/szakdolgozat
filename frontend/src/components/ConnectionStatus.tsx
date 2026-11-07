import { useTranslation } from "react-i18next";
import { useServerState } from "../hooks/useServerState";

export function ConnectionStatus() {
  const { t } = useTranslation();
  const { connection } = useServerState();

  return <p role="status">{t(`common:connection.${connection}`)}</p>;
}
