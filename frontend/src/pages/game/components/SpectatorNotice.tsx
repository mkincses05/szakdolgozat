import type { PublicPlayerView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

/** `me` is `null` for a spectator who does not play in the match. */
export function SpectatorNotice({ me }: { me: PublicPlayerView | null }) {
  const { t } = useTranslation("game");

  return (
    <p>
      {me?.matchStatus === "finished" && `${t("spectator.finished", { position: me.finishPosition })} `}
      {me?.matchStatus === "forfeited" && `${t("spectator.forfeited")} `}
      {t("spectator.watching")}
    </p>
  );
}
