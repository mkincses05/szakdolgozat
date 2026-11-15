// The first page outside a room: log in, register, or continue as a guest. Without a database the
// server cannot handle accounts, so only the guest option remains.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { ErrorMessage } from "../../components/ErrorMessage";
import { HeroBanner } from "../../components/HeroBanner";
import { LanguageSelect } from "../../components/LanguageSelect";
import { Panel } from "../../components/Panel";
import { useAccount } from "../../hooks/useAccount";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";

type Form = "login" | "register";

export function WelcomePage() {
  const { t } = useTranslation("welcome");
  const account = useAccount();
  const [form, setForm] = useState<Form | null>(null);
  const accountsAvailable = account.status !== "unavailable";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <div className="self-end">
        <LanguageSelect />
      </div>
      <HeroBanner subtitle={t("intro")} />

      <Panel className="flex flex-col gap-4">
        {accountsAvailable ? (
          <div className="grid grid-cols-2 gap-2 rounded-full bg-ink-dark/5 p-1.5">
            <Button variant="secondary" aria-pressed={form === "login"} onClick={() => setForm("login")}>
              {t("showLogin")}
            </Button>
            <Button variant="secondary" aria-pressed={form === "register"} onClick={() => setForm("register")}>
              {t("showRegister")}
            </Button>
          </div>
        ) : (
          <ErrorMessage code={account.unavailableReason} />
        )}

        {accountsAvailable && form === "login" && <LoginForm />}
        {accountsAvailable && form === "register" && <RegisterForm />}

        <Button size="lg" className="w-full" onClick={account.continueAsGuest}>
          {t("continueAsGuest")}
        </Button>
      </Panel>
    </main>
  );
}
