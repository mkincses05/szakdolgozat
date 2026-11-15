import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { FormMessage } from "../../../components/FormMessage";
import { TextField } from "../../../components/TextField";
import { useRegisterForm, type RegisterField } from "../hooks/useRegisterForm";

const FIELDS: { field: RegisterField; type?: "email" | "password"; autoComplete: string; maxLength: number }[] = [
  { field: "username", autoComplete: "username", maxLength: USERNAME_MAX_LENGTH },
  { field: "email", type: "email", autoComplete: "email", maxLength: EMAIL_MAX_LENGTH },
  { field: "displayName", autoComplete: "nickname", maxLength: DISPLAY_NAME_MAX_LENGTH },
  { field: "password", type: "password", autoComplete: "new-password", maxLength: PASSWORD_MAX_LENGTH }
];

/** Values for the length placeholders in the validation messages. */
const LIMITS: Record<RegisterField, { min?: number; max?: number }> = {
  username: { min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH },
  email: {},
  displayName: { min: DISPLAY_NAME_MIN_LENGTH, max: DISPLAY_NAME_MAX_LENGTH },
  password: { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH }
};

export function RegisterForm() {
  const { t } = useTranslation("welcome");
  const form = useRegisterForm();

  return (
    <form
      className="flex flex-col gap-3"
      // The fields are checked with the shared schemas and translated messages, not by the browser.
      noValidate
      aria-label={t("register.title")}
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <h2 className="text-xl font-bold">{t("register.title")}</h2>
      {FIELDS.map(({ field, type, autoComplete, maxLength }) => (
        <TextField
          key={field}
          label={t(`register.fields.${field}`)}
          type={type}
          value={form.values[field]}
          onChange={(value) => form.setValue(field, value)}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
      ))}
      <Button type="submit" disabled={form.pending}>
        {t("register.submit")}
      </Button>
      {form.invalidFields.map((field) => (
        <FormMessage key={field}>{t(`register.validation.${field}`, LIMITS[field])}</FormMessage>
      ))}
      <ErrorMessage code={form.error} />
    </form>
  );
}
