import type { AccountProfile } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";

const STAT_CLASSES = {
  xp: "bg-accent-light",
  matchesPlayed: "bg-card-blue-light/40",
  wins: "bg-card-green-light/40",
  forfeits: "bg-card-red-light/30"
} as const;

interface AccountSummaryProps {
  profile: AccountProfile;
  onLogout: () => void;
  logoutPending: boolean;
}

export function AccountSummary({ profile, onLogout, logoutPending }: AccountSummaryProps) {
  const { t } = useTranslation("landing");

  const stats = [
    ["xp", profile.xp],
    ["matchesPlayed", profile.matchesPlayed],
    ["wins", profile.wins],
    ["forfeits", profile.forfeits]
  ] as const;

  return (
    <section className="flex flex-col gap-4" aria-label={t("account.title")}>
      <p className="text-lg font-semibold">
        {t("account.loggedInAs", { name: profile.displayName, username: profile.username })}
      </p>
      <dl className="grid grid-cols-2 gap-2">
        {stats.map(([key, value]) => (
          <div key={key} className={`flex flex-col rounded-2xl px-3 py-2 text-ink-dark ${STAT_CLASSES[key]}`}>
            <dt className="text-sm font-medium opacity-80">{t(`account.${key}`)}</dt>
            <dd className="text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" disabled={logoutPending} onClick={onLogout}>
        {t("account.logout")}
      </Button>
    </section>
  );
}
