import { useTranslation } from "react-i18next";
import { useServerState } from "../../hooks/useServerState";
import { PlayerControls } from "./components/PlayerControls";
import { PlayerList } from "./components/PlayerList";
import { TableInfo } from "./components/TableInfo";
import { TurnInfo } from "./components/TurnInfo";

export function GamePage() {
  const { t } = useTranslation("game");
  const { match, session } = useServerState();

  if (!match || !session) {
    return null;
  }

  return (
    <main className="flex max-w-3xl flex-col gap-4">
      <h1>{t("title")}</h1>
      <TurnInfo view={match} userId={session.userId} />
      <TableInfo view={match} />
      <PlayerList view={match} userId={session.userId} />
      {match.viewer === "player" && <PlayerControls view={match} />}
    </main>
  );
}
