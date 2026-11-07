import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { useLoginForm } from "../hooks/useLoginForm";
import { TextField } from "./TextField";

export function LoginForm() {
  const { t } = useTranslation("welcome");
  const form = useLoginForm();

  return (
    <form
      className="flex flex-col gap-2"
      // The fields are checked with the shared schemas and translated messages, not by the browser.
      noValidate
      aria-label={t("login.title")}
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <h2>{t("login.title")}</h2>
      <TextField
        label={t("login.login")}
        value={form.values.login}
        onChange={form.setLogin}
        autoComplete="username"
        maxLength={EMAIL_MAX_LENGTH}
      />
      <TextField
        label={t("login.password")}
        type="password"
        value={form.values.password}
        onChange={form.setPassword}
        autoComplete="current-password"
        maxLength={PASSWORD_MAX_LENGTH}
      />
      <button type="submit" className="border px-2 py-1" disabled={form.pending}>
        {t("login.submit")}
      </button>
      {form.missingInput && <p role="alert">{t("login.missingInput")}</p>}
      <ErrorMessage code={form.error} />
    </form>
  );
}
