import type { AccountProfile } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface AccountSummaryProps {
  profile: AccountProfile;
  onLogout: () => void;
}

export function AccountSummary({ profile, onLogout }: AccountSummaryProps) {
  const { t } = useTranslation("landing");

  const stats = [
    ["xp", profile.xp],
    ["matchesPlayed", profile.matchesPlayed],
    ["wins", profile.wins],
    ["forfeits", profile.forfeits]
  ] as const;

  return (
    <section className="flex flex-col gap-2" aria-label={t("account.title")}>
      <p>{t("account.loggedInAs", { name: profile.displayName, username: profile.username })}</p>
      <dl className="grid grid-cols-2 gap-1">
        {stats.map(([key, value]) => (
          <div key={key} className="contents">
            <dt>{t(`account.${key}`)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="border px-2 py-1" onClick={onLogout}>
        {t("account.logout")}
      </button>
    </section>
  );
}
