// Room and match views sent to clients. Private hands appear only in the owner's view (R25).
// See docs/02-server-state-machine-and-socketio.md, section 3.

import type { Card, CardColor } from "./cards.js";
import type { MatchPhase, MatchStatus, Presence, RoomState } from "./status.js";

export interface RoomMemberView {
  userId: string;
  displayName: string;
  presence: Presence;
}

export interface RoomView {
  code: string;
  state: RoomState;
  hostUserId: string;
  /** In join order, used for host transfer (R24). */
  members: RoomMemberView[];
  minPlayers: number;
  maxPlayers: number;
}

/** Public information about a match player: hand size only, never the hand (R25). */
export interface PublicPlayerView {
  userId: string;
  displayName: string;
  seat: number;
  handSize: number;
  matchStatus: MatchStatus;
  presence: Presence;
  finishPosition: number | null;
  isBot: boolean;
}

/** Match state visible to everyone in the match, including spectators (R25). */
export interface PublicMatchView {
  matchId: string;
  phase: MatchPhase;
  /** In seat order. */
  players: PublicPlayerView[];
  currentPlayerId: string | null;
  topCard: Card;
  /** Color chosen by Color Change, `null` when none is active (R6). */
  activeColor: CardColor | null;
  /** Accumulated +2 penalty, 0 when none is active (R10). */
  pendingPenalty: number;
  drawPileSize: number;
  /** Epoch milliseconds, `null` when no turn is running. */
  turnDeadline: number | null;
  /** User IDs in finishing order. */
  finishingOrder: string[];
  stateVersion: number;
}

/** Personal view of an active or finished player; contains only their own hand. */
export interface PlayerMatchView extends PublicMatchView {
  viewer: "player";
  userId: string;
  hand: Card[];
}

/** Spectator view without any hand (R25). */
export interface SpectatorMatchView extends PublicMatchView {
  viewer: "spectator";
}

export type MatchView = PlayerMatchView | SpectatorMatchView;
