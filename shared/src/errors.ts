// Stable error codes returned in acknowledgements. The client translates them with i18n;
// the server never sends translated text.

export const ERROR_CODES = [
  "invalid_payload",
  "stale_state",
  "internal_error",

  "invalid_reconnect_token",
  "session_expired",

  "room_not_found",
  "room_full",
  "room_in_match",
  "not_in_room",
  "not_host",
  "not_enough_players",
  "too_many_players",

  "match_not_running",
  "not_in_match",
  "player_not_active",
  "not_your_turn",

  "card_not_in_hand",
  "illegal_card",
  "invalid_combo",
  "too_many_special_cards",
  "penalty_active",
  "missing_color",
  "unexpected_color",
  "missing_target",
  "unexpected_target",
  "invalid_target",
  "missing_swap_selection",
  "unexpected_swap_selection",
  "invalid_target_position",
  "hand_limit_reached"
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}
