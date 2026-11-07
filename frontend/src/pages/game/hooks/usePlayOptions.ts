// The extra choices of a special card play: the color of Color Change (R6), the target of Swap and
// Spy, and the Swap selection (R12). Which choices a card needs follows the `game:play` payload
// contract (docs/02, section 5); the targets and the cards to give come from the shared helpers.
// The choices belong to one state version and one selected card.

import {
  getSwapOffers,
  getValidTargets,
  type Card,
  type CardColor,
  type PlayerMatchView
} from "@wildhand/shared";
import { useState } from "react";

export interface PlayOptions {
  chosenColor?: CardColor;
  targetPlayerId?: string;
  swapCardId?: string;
  targetCardPosition?: number;
}

interface StoredOptions {
  key: string;
  options: PlayOptions;
}

export function usePlayOptions(view: PlayerMatchView, card: Card | undefined) {
  const key = `${view.stateVersion}:${card?.id ?? ""}`;
  const [stored, setStored] = useState<StoredOptions>({ key, options: {} });
  const options = stored.key === key ? stored.options : {};

  const needsColor = card?.kind === "colorChange";
  const targets = card?.kind === "swap" || card?.kind === "spy" ? getValidTargets(view) : [];
  const swapOffers = card?.kind === "swap" ? getSwapOffers(view, card) : [];
  const target = targets.find((player) => player.userId === options.targetPlayerId);

  const update = (patch: PlayOptions) => setStored({ key, options: { ...options, ...patch } });

  const complete =
    (!needsColor || options.chosenColor !== undefined) &&
    (targets.length === 0 || target !== undefined) &&
    (swapOffers.length === 0 || (options.swapCardId !== undefined && options.targetCardPosition !== undefined));

  return {
    options,
    needsColor,
    targets,
    target,
    swapOffers,
    complete,
    chooseColor: (chosenColor: CardColor) => update({ chosenColor }),
    // A new target has a different hand, so the face-down position is chosen again.
    chooseTarget: (targetPlayerId: string) => update({ targetPlayerId, targetCardPosition: undefined }),
    chooseSwapCard: (swapCardId: string) => update({ swapCardId }),
    choosePosition: (targetCardPosition: number) => update({ targetCardPosition })
  };
}
