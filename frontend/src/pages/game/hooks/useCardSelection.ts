// The cards selected for the next play. The first card must be a legal card, further cards come
// from its combo partners (R8); both lists come from the shared helpers. The selection belongs to
// one `stateVersion` and is dropped when a new state arrives.

import { getComboPartners, getLegalCards, type Card, type PlayerMatchView } from "@wildhand/shared";
import { useMemo, useState } from "react";

interface Selection {
  stateVersion: number;
  cardIds: string[];
}

/** Shared empty selection, so the memoized values below keep their identity between renders. */
const NO_CARDS: string[] = [];

export function useCardSelection(view: PlayerMatchView) {
  const [selection, setSelection] = useState<Selection>({ stateVersion: view.stateVersion, cardIds: NO_CARDS });
  const selectedIds = selection.stateVersion === view.stateVersion ? selection.cardIds : NO_CARDS;
  const first = useMemo(() => view.hand.find((card) => card.id === selectedIds[0]), [view, selectedIds]);

  const selectableIds = useMemo(() => {
    const candidates = first ? [first, ...getComboPartners(view, first)] : getLegalCards(view);
    return new Set(candidates.map((card) => card.id));
  }, [view, first]);

  const toggle = (card: Card) => {
    let cardIds: string[];
    if (selectedIds.includes(card.id)) {
      // Deselecting the first card drops the combo built on it.
      cardIds = card.id === selectedIds[0] ? NO_CARDS : selectedIds.filter((id) => id !== card.id);
    } else if (selectableIds.has(card.id)) {
      cardIds = [...selectedIds, card.id];
    } else {
      return;
    }
    setSelection({ stateVersion: view.stateVersion, cardIds });
  };

  return { selectedIds, first, selectableIds, toggle };
}
