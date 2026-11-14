// The first page outside a room: log in, register, or continue as a guest. Without a database the
// server cannot handle accounts, so only the guest option remains.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../components/ErrorMessage";
import { LanguageSelect } from "../../components/LanguageSelect";
import { useAccount } from "../../hooks/useAccount";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";

type Form = "login" | "register";

export function WelcomePage() {
  const { t } = useTranslation("welcome");
  const account = useAccount();
  const [form, setForm] = useState<Form | null>(null);

  return (
    <main className="flex max-w-sm flex-col gap-4">
      <h1>{t("common:app.title")}</h1>
      <p>{t("intro")}</p>

      <LanguageSelect />

      {account.status === "unavailable" ? (
        <ErrorMessage code={account.unavailableReason} />
      ) : (
        <div className="flex gap-2">
          <button type="button" className="border px-2 py-1" aria-pressed={form === "login"} onClick={() => setForm("login")}>
            {t("showLogin")}
          </button>
          <button
            type="button"
            className="border px-2 py-1"
            aria-pressed={form === "register"}
            onClick={() => setForm("register")}
          >
            {t("showRegister")}
          </button>
        </div>
      )}

      {account.status !== "unavailable" && form === "login" && <LoginForm />}
      {account.status !== "unavailable" && form === "register" && <RegisterForm />}

      <button type="button" className="border px-2 py-1" onClick={account.continueAsGuest}>
        {t("continueAsGuest")}
      </button>
    </main>
  );
}
