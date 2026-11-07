import type { MatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useCardLabel } from "../hooks/useCardLabel";

export function TableInfo({ view }: { view: MatchView }) {
  const { t } = useTranslation("game");
  const cardLabel = useCardLabel();

  return (
    <section>
      <p>{t("table.topCard", { card: cardLabel(view.topCard) })}</p>
      {view.activeColor && <p>{t("table.activeColor", { color: t(`common:colors.${view.activeColor}`) })}</p>}
      {view.pendingPenalty > 0 && <p>{t("table.penalty", { count: view.pendingPenalty })}</p>}
      <p>{t("table.drawPile", { count: view.drawPileSize })}</p>
    </section>
  );
}
