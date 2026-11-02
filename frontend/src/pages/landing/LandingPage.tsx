import { useTranslation } from "react-i18next";

export function LandingPage() {
  const { t } = useTranslation("landing");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-100">
      <h1 className="text-4xl font-bold">{t("common:app.title")}</h1>
      <p className="text-slate-400">{t("tagline")}</p>
    </main>
  );
}
