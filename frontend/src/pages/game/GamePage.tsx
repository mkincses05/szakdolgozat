import { useTranslation } from "react-i18next";
import { useServerState } from "../../hooks/useServerState";
import { EffectLog } from "./components/EffectLog";
import { LeaveMatchButton } from "./components/LeaveMatchButton";
import { PlayerControls } from "./components/PlayerControls";
import { PlayerList } from "./components/PlayerList";
import { SpectatorNotice } from "./components/SpectatorNotice";
import { TableInfo } from "./components/TableInfo";
import { TurnInfo } from "./components/TurnInfo";

export function GamePage() {
  const { t } = useTranslation("game");
  const { match, session } = useServerState();

  if (!match || !session) {
    return null;
  }

  const me = match.players.find((player) => player.userId === session.userId) ?? null;
  const isActive = match.viewer === "player" && me?.matchStatus === "active";

  return (
    <main className="flex max-w-3xl flex-col gap-4">
      <h1>{t("title")}</h1>
      <TurnInfo view={match} userId={session.userId} />
      <TableInfo view={match} />
      <PlayerList view={match} userId={session.userId} />
      {isActive && match.viewer === "player" ? <PlayerControls view={match} /> : <SpectatorNotice me={me} />}
      <EffectLog view={match} />
      <LeaveMatchButton forfeits={isActive} />
    </main>
  );
}
