import { getDrawOption, type PlayerMatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { useCardSelection } from "../hooks/useCardSelection";
import { useGameActions } from "../hooks/useGameActions";
import { usePlayOptions } from "../hooks/usePlayOptions";
import { ColorPicker } from "./ColorPicker";
import { DrawButton } from "./DrawButton";
import { PlayerHand } from "./PlayerHand";
import { SwapPicker } from "./SwapPicker";
import { TargetPicker } from "./TargetPicker";

export function PlayerControls({ view }: { view: PlayerMatchView }) {
  const { t } = useTranslation("game");
  const selection = useCardSelection(view);
  const actions = useGameActions(view.stateVersion);
  const first = view.hand.find((card) => card.id === selection.selectedIds[0]);
  const play = usePlayOptions(view, first);

  return (
    <section className="flex flex-col gap-2">
      <PlayerHand
        hand={view.hand}
        selectedIds={selection.selectedIds}
        selectableIds={selection.selectableIds}
        onToggle={selection.toggle}
      />

      {play.needsColor && <ColorPicker value={play.options.chosenColor} onChange={play.chooseColor} />}
      {play.targets.length > 0 && (
        <TargetPicker targets={play.targets} value={play.options.targetPlayerId} onChange={play.chooseTarget} />
      )}
      {play.swapOffers.length > 0 && (
        <SwapPicker
          offers={play.swapOffers}
          targetHandSize={play.target?.handSize ?? null}
          swapCardId={play.options.swapCardId}
          position={play.options.targetCardPosition}
          onSwapCardChange={play.chooseSwapCard}
          onPositionChange={play.choosePosition}
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="border px-2 py-1"
          disabled={actions.pending || selection.selectedIds.length === 0 || !play.complete}
          onClick={() => actions.play({ cardIds: selection.selectedIds, ...play.options })}
        >
          {t("actions.play")}
        </button>
        <DrawButton
          option={getDrawOption(view)}
          penalty={view.pendingPenalty}
          disabled={actions.pending}
          onDraw={actions.draw}
        />
      </div>
      <ErrorMessage code={actions.error} />
    </section>
  );
}
