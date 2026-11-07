import { getDrawOption, type PlayerMatchView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { useCardSelection } from "../hooks/useCardSelection";
import { useGameActions } from "../hooks/useGameActions";
import { DrawButton } from "./DrawButton";
import { PlayerHand } from "./PlayerHand";

export function PlayerControls({ view }: { view: PlayerMatchView }) {
  const { t } = useTranslation("game");
  const selection = useCardSelection(view);
  const actions = useGameActions(view.stateVersion);

  return (
    <section className="flex flex-col gap-2">
      <PlayerHand
        hand={view.hand}
        selectedIds={selection.selectedIds}
        selectableIds={selection.selectableIds}
        onToggle={selection.toggle}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="border px-2 py-1"
          disabled={actions.pending || selection.selectedIds.length === 0}
          onClick={() => actions.play({ cardIds: selection.selectedIds })}
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
