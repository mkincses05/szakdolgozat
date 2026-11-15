// The extra choices of the selected special card, above the hand: the color of Color Change, the
// target of Swap and Spy (chosen on the table), and the cards of Swap.

import type { Card, CardColor, PublicPlayerView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import type { PlayOptions } from "../hooks/usePlayOptions";
import { ColorPicker } from "./ColorPicker";
import { SwapPicker } from "./SwapPicker";

interface PlayOptionsSheetProps {
  options: PlayOptions;
  needsColor: boolean;
  needsTarget: boolean;
  target: PublicPlayerView | undefined;
  swapOffers: Card[];
  onColor: (color: CardColor) => void;
  onSwapCard: (cardId: string) => void;
  onPosition: (position: number) => void;
}

export function PlayOptionsSheet({
  options,
  needsColor,
  needsTarget,
  target,
  swapOffers,
  onColor,
  onSwapCard,
  onPosition
}: PlayOptionsSheetProps) {
  const { t } = useTranslation("game");

  if (!needsColor && !needsTarget && swapOffers.length === 0) {
    return null;
  }
  return (
    <section className="mx-auto flex w-fit max-w-full animate-pop-in flex-col items-center gap-4 rounded-panel bg-white/95 px-5 py-4 text-ink-dark shadow-panel">
      {needsColor && <ColorPicker value={options.chosenColor} onChange={onColor} />}
      {needsTarget && (
        <p className="text-center">
          <span className="block font-semibold">{t("options.target")}</span>
          {target ? (
            <span className="font-bold text-brand">{target.displayName}</span>
          ) : (
            <span className="text-sm text-ink-soft">{t("options.targetHint")}</span>
          )}
        </p>
      )}
      {swapOffers.length > 0 && (
        <SwapPicker
          offers={swapOffers}
          targetHandSize={target?.handSize ?? null}
          swapCardId={options.swapCardId}
          position={options.targetCardPosition}
          onSwapCardChange={onSwapCard}
          onPositionChange={onPosition}
        />
      )}
    </section>
  );
}
