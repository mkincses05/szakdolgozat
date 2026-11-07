import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useLeaveRoom } from "../../hooks/useLeaveRoom";
import { useServerState } from "../../hooks/useServerState";
import { StandingsList } from "./components/StandingsList";
import { usePlayerNames } from "./hooks/usePlayerNames";

export function ResultsPage() {
  const { t } = useTranslation("results");
  const { results, session, dismissResults } = useServerState();
  const leave = useLeaveRoom();
  const nameOf = usePlayerNames(results?.matchId ?? "");

  if (!results || !session) {
    return null;
  }

  return (
    <main className="flex max-w-md flex-col gap-4">
      <h1>{t("title")}</h1>
      <p>{t("winner", { name: nameOf(results.winnerId) })}</p>
      <p>{t(`endReason.${results.endReason}`)}</p>

      <StandingsList standings={results.standings} userId={session.userId} nameOf={nameOf} />

      <button type="button" className="border px-2 py-1" onClick={dismissResults}>
        {t("backToLobby")}
      </button>
      <button type="button" className="border px-2 py-1" disabled={leave.pending} onClick={leave.leaveRoom}>
        {t("leave")}
      </button>
      <ErrorMessage code={leave.error} />
    </main>
  );
}
