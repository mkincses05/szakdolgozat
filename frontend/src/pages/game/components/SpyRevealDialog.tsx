import type { MatchView, SpyReveal } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { PlayingCard } from "../../../components/PlayingCard";
import { Dialog } from "./Dialog";

interface SpyRevealDialogProps {
  reveal: SpyReveal;
  view: MatchView;
  onClose: () => void;
}

/** The hand seen with Spy. The server sends it only to the Spy player (R14); it is a snapshot. */
export function SpyRevealDialog({ reveal, view, onClose }: SpyRevealDialogProps) {
  const { t } = useTranslation("game");
  const name = view.players.find((player) => player.userId === reveal.targetPlayerId)?.displayName ?? "";

  return (
    <Dialog title={t("spyDialog.title", { name })} onClose={onClose}>
      <p className="text-ink-soft">{t("spyDialog.private")}</p>
      <ul className="flex flex-wrap justify-center gap-2">
        {reveal.hand.map((card) => (
          <li key={card.id} className="animate-card-enter">
            <PlayingCard card={card} size="md" />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
