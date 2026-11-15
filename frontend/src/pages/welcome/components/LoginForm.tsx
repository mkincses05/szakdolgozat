import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { FormMessage } from "../../../components/FormMessage";
import { TextField } from "../../../components/TextField";
import { useLoginForm } from "../hooks/useLoginForm";

export function LoginForm() {
  const { t } = useTranslation("welcome");
  const form = useLoginForm();

  return (
    <form
      className="flex flex-col gap-3"
      // The fields are checked with the shared schemas and translated messages, not by the browser.
      noValidate
      aria-label={t("login.title")}
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <h2 className="text-xl font-bold">{t("login.title")}</h2>
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
      <Button type="submit" disabled={form.pending}>
        {t("login.submit")}
      </Button>
      {form.missingInput && <FormMessage>{t("login.missingInput")}</FormMessage>}
      <ErrorMessage code={form.error} />
    </form>
  );
}
