import type { PublicPlayerView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

/** Shown instead of the hand to everybody who only watches. `me` is `null` for a spectator who does not play. */
export function SpectatorNotice({ me }: { me: PublicPlayerView | null }) {
  const { t } = useTranslation("game");

  return (
    <div className="flex justify-center py-4">
      <p className="animate-pop-in rounded-full bg-surface px-6 py-3 text-center text-lg font-semibold text-ink shadow-panel">
        {me?.matchStatus === "finished" && `${t("spectator.finished", { position: me.finishPosition })} `}
        {me?.matchStatus === "forfeited" && `${t("spectator.forfeited")} `}
        {t("spectator.watching")}
      </p>
    </div>
  );
}
