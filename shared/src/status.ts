// Room, match, and player status values.
// See docs/02-server-state-machine-and-socketio.md, section 1.

export const ROOM_STATES = ["lobby", "in_match", "closed"] as const;
export type RoomState = (typeof ROOM_STATES)[number];

export const MATCH_PHASES = ["dealing", "awaiting_action", "ended"] as const;
export type MatchPhase = (typeof MATCH_PHASES)[number];

export const MATCH_STATUSES = ["active", "finished", "forfeited"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const PRESENCES = ["connected", "disconnected", "left"] as const;
export type Presence = (typeof PRESENCES)[number];

/** `no_humans`: only computer players are left in the match (R21). */
export const MATCH_END_REASONS = ["last_player", "blocked", "forfeits", "no_humans"] as const;
export type MatchEndReason = (typeof MATCH_END_REASONS)[number];
