import { useTranslation } from "react-i18next";
import type { ActionErrorCode } from "../services/actions";
import { FormMessage } from "./FormMessage";

/** Shows the translation of a server or client error code; renders nothing without a code. */
export function ErrorMessage({ code, className }: { code: ActionErrorCode | null; className?: string }) {
  const { t } = useTranslation();

  if (code === null) {
    return null;
  }
  return <FormMessage className={className}>{t(`common:errors.${code}`)}</FormMessage>;
}
