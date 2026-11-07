import { useTranslation } from "react-i18next";
import type { ActionErrorCode } from "../services/actions";

/** Shows the translation of a server or client error code; renders nothing without a code. */
export function ErrorMessage({ code }: { code: ActionErrorCode | null }) {
  const { t } = useTranslation();

  if (code === null) {
    return null;
  }
  return <p role="alert">{t(`common:errors.${code}`)}</p>;
}
