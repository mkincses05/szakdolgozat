// The layout of the game page: top bar, the table with the other players around it, and the
// bottom area with the own seat and whatever the viewer can do (the hand, or a spectator notice).
// The events of the match are collected here once and shown in the drawer, as toasts on the table,
// and as the Spy dialog.

import type { MatchView } from "@wildhand/shared";
import type { ReactNode } from "react";
import { useServerState } from "../../../hooks/useServerState";
import { useEffectLog } from "../hooks/useEffectLog";
import { useLatestEvent } from "../hooks/useLatestEvent";
import { useSeatLayout } from "../hooks/useSeatLayout";
import { useSpyReveal } from "../hooks/useSpyReveal";
import type { DrawControl } from "./DrawPile";
import { EffectToast } from "./EffectToast";
import { GameTable } from "./GameTable";
import { PlayerSeat } from "./PlayerSeat";
import { SeatRing, type Targeting } from "./SeatRing";
import { SpyRevealDialog } from "./SpyRevealDialog";
import { TopBar } from "./TopBar";

interface GameScreenProps {
  view: MatchView;
  userId: string;
  /** Leaving forfeits while the viewer is still an active player. */
  forfeits: boolean;
  draw: DrawControl | null;
  targeting: Targeting | null;
  children: ReactNode;
}

export function GameScreen({ view, userId, forfeits, draw, targeting, children }: GameScreenProps) {
  const { room } = useServerState();
  const layout = useSeatLayout(view.players, userId);
  const events = useEffectLog();
  const latest = useLatestEvent(events);
  const spy = useSpyReveal(events);
  const stormKey = latest?.entry.type === "effect" && latest.entry.effect.type === "storm" ? latest.id : null;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <TopBar view={view} userId={userId} roomCode={room?.code ?? null} forfeits={forfeits} events={events} />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2 px-2 pt-1 md:block md:px-4">
        <GameTable view={view} draw={draw} userId={userId} stormKey={stormKey} />
        <SeatRing view={view} seats={layout.others} compact={layout.compact} targeting={targeting} />
        {latest && <EffectToast key={latest.id} item={latest} view={view} />}
      </div>

      <footer className="relative z-20 flex items-end gap-2 px-2 pb-2 md:px-4">
        {layout.me && (
          <ul className="hidden shrink-0 pb-2 sm:block">
            <PlayerSeat
              player={layout.me}
              isYou
              isCurrent={layout.me.userId === view.currentPlayerId}
              turnDeadline={view.turnDeadline}
              serverTime={view.serverTime}
            />
          </ul>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </footer>

      {spy.reveal && <SpyRevealDialog reveal={spy.reveal} view={view} onClose={spy.dismiss} />}
    </main>
  );
}
