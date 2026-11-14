import type { MatchView, PublicPlayerView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useBotLabel } from "../../../hooks/useBotLabel";

interface PlayerListProps {
  view: MatchView;
  userId: string;
}

export function PlayerList({ view, userId }: PlayerListProps) {
  const { t } = useTranslation("game");
  const botLabel = useBotLabel();

  const describe = (player: PublicPlayerView) =>
    [
      t("players.cards", { count: player.handSize }),
      player.matchStatus === "finished" && t("players.finished", { position: player.finishPosition }),
      player.matchStatus === "forfeited" && t("players.forfeited"),
      t(`common:presence.${player.presence}`),
      player.userId === view.currentPlayerId && t("players.onTurn")
    ]
      .filter(Boolean)
      .join(" – ");

  return (
    <section>
      <h2>{t("players.title")}</h2>
      <ul className="list-disc pl-6">
        {view.players.map((player) => (
          <li key={player.userId}>
            {player.displayName}
            {player.botLevel !== null && ` (${botLabel(player.botLevel)})`}
            {player.userId === userId && ` (${t("players.you")})`}: {describe(player)}
          </li>
        ))}
      </ul>
    </section>
  );
}
