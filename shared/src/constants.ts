// Rule constants. Rule IDs refer to docs/01-game-analysis-and-design.md.

/** R1 */
export const MIN_PLAYERS = 2;
/** R1 */
export const MAX_PLAYERS = 8;

/** R3 */
export const STARTING_HAND_SIZE = 7;

/** R2 */
export const DECK_SIZE = 104;
/** R2: number cards per color and number. */
export const NUMBER_CARD_COPIES = 2;
/** R2: +2 cards per color. */
export const PLUS2_COPIES_PER_COLOR = 2;
/** R2: Swap cards per color. */
export const SWAP_COPIES_PER_COLOR = 1;
/** R2: copies of each wild card kind. */
export const WILD_CARD_COPIES = 4;

/** R10: penalty added by each +2. */
export const PLUS2_PENALTY = 2;

/** R11: Storm requested value range, inclusive. */
export const STORM_MIN = 1;
export const STORM_MAX = 3;

/** R16 */
export const HAND_LIMIT = 20;

/** R19: with this many or fewer reusable discard cards, a new deck is added. */
export const RESHUFFLE_THRESHOLD = 25;

/** R22: default turn time limit. */
export const DEFAULT_TURN_TIMEOUT_MS = 60_000;
/** R23: default reconnect grace period. */
export const DEFAULT_RECONNECT_GRACE_MS = 60_000;

export const ROOM_CODE_LENGTH = 6;
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 24;
