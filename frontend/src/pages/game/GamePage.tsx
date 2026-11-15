import { useServerState } from "../../hooks/useServerState";
import { ActivePlayerScreen } from "./components/ActivePlayerScreen";
import { GameScreen } from "./components/GameScreen";
import { SpectatorNotice } from "./components/SpectatorNotice";

export function GamePage() {
  const { match, session } = useServerState();

  if (!match || !session) {
    return null;
  }

  const me = match.players.find((player) => player.userId === session.userId) ?? null;

  if (match.viewer === "player" && me?.matchStatus === "active") {
    return <ActivePlayerScreen view={match} />;
  }
  // Finished players, players who forfeited, and spectators watch the rest of the match.
  return (
    <GameScreen view={match} userId={session.userId} forfeits={false} draw={null} targeting={null}>
      <SpectatorNotice me={me} />
    </GameScreen>
  );
}
