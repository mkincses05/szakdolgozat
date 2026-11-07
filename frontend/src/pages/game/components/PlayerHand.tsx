import type { Card } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useCardLabel } from "../hooks/useCardLabel";

interface PlayerHandProps {
  hand: Card[];
  selectedIds: string[];
  selectableIds: ReadonlySet<string>;
  onToggle: (card: Card) => void;
}

export function PlayerHand({ hand, selectedIds, selectableIds, onToggle }: PlayerHandProps) {
  const { t } = useTranslation("game");
  const cardLabel = useCardLabel();

  return (
    <section>
      <h2>{t("hand.title", { count: hand.length })}</h2>
      <div className="flex flex-wrap gap-2">
        {hand.map((card) => {
          const selected = selectedIds.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={clsx("border px-2 py-1 disabled:opacity-40", selected && "border-2 font-bold")}
              aria-pressed={selected}
              disabled={!selected && !selectableIds.has(card.id)}
              onClick={() => onToggle(card)}
            >
              {cardLabel(card)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
