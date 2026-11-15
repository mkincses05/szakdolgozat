import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { ErrorMessage } from "../../components/ErrorMessage";
import { Panel } from "../../components/Panel";
import { useLeaveRoom } from "../../hooks/useLeaveRoom";
import { useServerState } from "../../hooks/useServerState";
import { ResultHero } from "./components/ResultHero";
import { StandingsList } from "./components/StandingsList";
import { useBotLevels } from "./hooks/useBotLevels";
import { usePlayerNames } from "./hooks/usePlayerNames";

export function ResultsPage() {
  const { t } = useTranslation("results");
  const { results, session, dismissResults } = useServerState();
  const leave = useLeaveRoom();
  const nameOf = usePlayerNames(results?.matchId ?? "");
  const botLevelOf = useBotLevels(results?.matchId ?? "");

  if (!results || !session) {
    return null;
  }

  const mine = results.standings.find((standing) => standing.userId === session.userId) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <h1 className="text-4xl font-bold">{t("title")}</h1>

      <ResultHero mine={mine} />

      <Panel className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{t("winner", { name: nameOf(results.winnerId) })}</p>
          <p className="text-sm text-ink-soft">{t(`endReason.${results.endReason}`)}</p>
        </div>
        <StandingsList standings={results.standings} userId={session.userId} nameOf={nameOf} botLevelOf={botLevelOf} />
      </Panel>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={dismissResults}>
          {t("backToLobby")}
        </Button>
        <Button variant="secondary" size="lg" disabled={leave.pending} onClick={leave.leaveRoom}>
          {t("leave")}
        </Button>
      </div>
      <ErrorMessage code={leave.error} className="mx-auto" />
    </main>
  );
}
