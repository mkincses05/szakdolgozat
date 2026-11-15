// The game for an active player: the selection, the special-card choices, and the actions come
// from the hooks; the shared helpers decide what is playable, and the server decides the result.

import { getDrawOption, type PlayerMatchView } from "@wildhand/shared";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { useCardSelection } from "../hooks/useCardSelection";
import { useGameActions } from "../hooks/useGameActions";
import { usePlayOptions } from "../hooks/usePlayOptions";
import { ActionBar } from "./ActionBar";
import { GameScreen } from "./GameScreen";
import { HandArea } from "./HandArea";
import { PlayOptionsSheet } from "./PlayOptionsSheet";

export function ActivePlayerScreen({ view }: { view: PlayerMatchView }) {
  const selection = useCardSelection(view);
  const actions = useGameActions(view.stateVersion);
  const play = usePlayOptions(view, selection.first);
  const myTurn = view.currentPlayerId === view.userId;

  return (
    <GameScreen
      view={view}
      userId={view.userId}
      forfeits
      draw={{
        option: getDrawOption(view),
        penalty: view.pendingPenalty,
        disabled: actions.pending,
        onDraw: actions.draw
      }}
      targeting={
        play.targets.length > 0
          ? { targets: play.targets, selectedId: play.options.targetPlayerId, onSelect: play.chooseTarget }
          : null
      }
    >
      <div className="flex flex-col gap-1">
        <PlayOptionsSheet
          options={play.options}
          needsColor={play.needsColor}
          needsTarget={play.targets.length > 0}
          target={play.target}
          swapOffers={play.swapOffers}
          onColor={play.chooseColor}
          onSwapCard={play.chooseSwapCard}
          onPosition={play.choosePosition}
        />
        <ErrorMessage code={actions.error} className="mx-auto" />
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-end">
          <div className="w-full min-w-0 flex-1">
            <HandArea
              hand={view.hand}
              selectedIds={selection.selectedIds}
              selectableIds={selection.selectableIds}
              myTurn={myTurn}
              onToggle={selection.toggle}
            />
          </div>
          <div className="pb-2">
            <ActionBar
              canPlay={!actions.pending && selection.selectedIds.length > 0 && play.complete}
              onPlay={() => actions.play({ cardIds: selection.selectedIds, ...play.options })}
            />
          </div>
        </div>
      </div>
    </GameScreen>
  );
}
