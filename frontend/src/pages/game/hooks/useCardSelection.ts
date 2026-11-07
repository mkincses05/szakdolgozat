// The cards selected for the next play. The first card must be a legal card, further cards come
// from its combo partners (R8); both lists come from the shared helpers. The selection belongs to
// one `stateVersion` and is dropped when a new state arrives.

import { getComboPartners, getLegalCards, type Card, type PlayerMatchView } from "@wildhand/shared";
import { useMemo, useState } from "react";

interface Selection {
  stateVersion: number;
  cardIds: string[];
}

export function useCardSelection(view: PlayerMatchView) {
  const [selection, setSelection] = useState<Selection>({ stateVersion: view.stateVersion, cardIds: [] });
  const selectedIds = selection.stateVersion === view.stateVersion ? selection.cardIds : [];

  const selectableIds = useMemo(() => {
    const first = view.hand.find((card) => card.id === selectedIds[0]);
    const candidates = first ? [first, ...getComboPartners(view, first)] : getLegalCards(view);
    return new Set(candidates.map((card) => card.id));
  }, [view, selectedIds]);

  const toggle = (card: Card) => {
    let cardIds: string[];
    if (selectedIds.includes(card.id)) {
      // Deselecting the first card drops the combo built on it.
      cardIds = card.id === selectedIds[0] ? [] : selectedIds.filter((id) => id !== card.id);
    } else if (selectableIds.has(card.id)) {
      cardIds = [...selectedIds, card.id];
    } else {
      return;
    }
    setSelection({ stateVersion: view.stateVersion, cardIds });
  };

  return { selectedIds, selectableIds, toggle };
}
