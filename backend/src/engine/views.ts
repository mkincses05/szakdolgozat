// Client views of a match (R25, docs/02 section 3). Only the viewer's own hand is ever included.

import type { MatchView, PublicMatchView } from "@wildhand/shared";
import { findPlayer, topCard, type MatchState } from "./state.js";

/**
 * Data the engine does not own: display names come from the room, the deadline and the server
 * time from the turn timer's clock.
 */
export interface ViewContext {
  displayName(userId: string): string;
  turnDeadline: number | null;
  serverTime: number;
}

export function toPublicMatchView(state: MatchState, context: ViewContext): PublicMatchView {
  return {
    matchId: state.id,
    phase: state.phase,
    players: state.players.map((player) => ({
      userId: player.userId,
      displayName: context.displayName(player.userId),
      seat: player.seat,
      handSize: player.hand.length,
      matchStatus: player.matchStatus,
      presence: player.presence,
      finishPosition: player.finishPosition,
      isBot: player.isBot
    })),
    currentPlayerId: state.currentPlayerId,
    topCard: structuredClone(topCard(state)),
    activeColor: state.activeColor,
    pendingPenalty: state.pendingPenalty,
    drawPileSize: state.drawPile.length,
    turnDeadline: context.turnDeadline,
    serverTime: context.serverTime,
    finishingOrder: [...state.finishingOrder],
    stateVersion: state.stateVersion
  };
}

/**
 * Personal view for an active or finished match player; a spectator view for everyone else,
 * including forfeited players and room members outside the match.
 */
export function toMatchView(
  state: MatchState,
  viewerId: string | null,
  context: ViewContext,
  /** Pass the result of `toPublicMatchView` when building views for several viewers at once. */
  publicView: PublicMatchView = toPublicMatchView(state, context)
): MatchView {
  const viewer = viewerId === null ? undefined : findPlayer(state, viewerId);

  if (!viewer || viewer.matchStatus === "forfeited") {
    return { ...publicView, viewer: "spectator" };
  }

  return { ...publicView, viewer: "player", userId: viewer.userId, hand: structuredClone(viewer.hand) };
}
