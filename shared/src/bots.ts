// Computer players (docs/03 section 3). The values match the `bot_level` column of `match_players`.

export const BOT_LEVELS = ["random", "rule_based", "heuristic", "sampling"] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];

export function isBotLevel(value: unknown): value is BotLevel {
  return typeof value === "string" && (BOT_LEVELS as readonly string[]).includes(value);
}
