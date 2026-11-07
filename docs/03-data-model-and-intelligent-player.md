# Data Model, Intelligent Player Approach, and Measurement Plan

Rule IDs (R1–R25) refer to `docs/01-game-analysis-and-design.md`.

## 1. Runtime Data Model

The runtime model is the authoritative in-memory state of the server.

#### Card

- `id`: unique across every deck in the match, for example `d2-red-7-b`
- `deckInstance`: 1 for the base deck, increased for each deck added by R19
- `kind`: `number`, `plus2`, `storm`, `swap`, `colorChange`, or `spy`
- `color`: for number cards, +2, and Swap; empty for the wild cards Storm, Color Change, and Spy
- `number`: only for number cards

#### Room

- `id`, `code`
- `hostUserId`
- `members`: user IDs in join order, used for host transfer (R24)
- `state`: `lobby`, `in_match`, or `closed`
- `minPlayers` (2), `maxPlayers` (8)

#### MatchState

- `id`, `roomId`
- `phase`: `dealing`, `awaiting_action`, or `ended`
- `players`: list of `MatchPlayer` in seat order
- `currentPlayerId`
- `drawPile`, `discardPile`: ordered lists of cards
- `removedCards`: hands of forfeited players (R23)
- `activeColor`: the color chosen by Color Change; cleared when the next card is played on it (R6)
- `pendingPenalty`: accumulated +2 penalty, 0 when none is active
- `decksInPlay`: number of 104-card decks used so far
- `turnDeadline` (kept by the match controller with the turn timer, not by the engine)
- `stateVersion`
- `processedActionIds`: recently processed action IDs for duplicate detection, stored per player session together with their acknowledgements
- `seed`: seed of the random number generator, kept by the match controller
- `finishingOrder`
- `forfeitOrder`: forfeited players in forfeit order, for the ranking in R23
- `endReason`: `last_player`, `blocked`, or `forfeits` once the match has ended
- `startedAt`, `endedAt`

#### MatchPlayer

- `userId`, `seat`
- `hand`: list of cards (sent only to the owner)
- `matchStatus`: `active`, `finished`, or `forfeited`
- `presence`: `connected`, `disconnected`, or `left`
- `finishPosition`
- `isBot`

The hand limit (20) and the reshuffle threshold (25) are rule constants, not stored per match.

## 2. Persistent Data Model (PostgreSQL)

PostgreSQL stores registered user accounts and a statistics log of finished matches. Everything else stays in server memory: rooms, the live match state, guest and bot identities, and the reconnect token. Persistence is optional: without a configured database the server still runs matches and stores nothing.

### Principles

- Players can join as guests or as registered users who log in. Only registered users have a database row, and only they earn XP. Guests and bots exist only in server memory.
- The `users` row is the single source of truth for a user's XP and profile counters. They are updated when a match ends and are never computed from the match log.
- The level is not stored; a function in `shared/` derives it from the XP.
- `matches` and `match_players` are a statistics log only. Nothing is computed from them, and they may be pruned or archived at any time without affecting any user.
- Moves are not stored. The data for the bot evaluation (sections 4–5) is recorded by the headless simulator in its own output files, not in PostgreSQL.

### Tables

| Table | Content |
| --- | --- |
| `users` | Registered users: ID (UUID), username and email (both required, unique case-insensitively), display name, `xp`, `matches_played`, `wins`, `forfeits`, creation time, last-seen time |
| `user_credentials` | User ID, argon2id password hash, update time |
| `auth_sessions` | ID, user ID, SHA-256 hash of the login token, creation, last-use, and expiry time |
| `matches` | Match ID, seed, player count (2–8), turn time limit, start and end time, end reason (`last_player`, `blocked`, `forfeits`, or `aborted`), winner seat (empty when there is no winner) |
| `match_players` | Match ID, seat, player kind (`guest`, `registered`, or `bot`), user ID (registered players only), bot level (bots only), display name at match time, final status, finish position, XP earned |
| `schema_migrations` | Applied migration versions with their application time |

### Constraints

- The XP and counter columns of `users` cannot be negative, and `wins + forfeits` cannot exceed `matches_played`.
- The primary key of `match_players` is the match ID and the seat. A user appears at most once per match, and several players can share a finish position after a blocked game (R21).
- Only registered players have a user ID and earned XP in `match_players`; only bots have a bot level.
- Deleting a match deletes its `match_players` rows. Deleting a user sets the user ID to empty in the log and deletes the user's credentials and sessions. Neither deletion changes any other user's counters.
- `aborted` marks a match stopped without a regular end, for example on server shutdown.

### Writing the result of a match

When a match ends, the server writes the `matches` row, every `match_players` row, and the counter updates of all registered participants in a single transaction. Counters are increased atomically in SQL (for example `xp = xp + $1`), never read, changed, and written back. An `aborted` match is logged but does not change any counter. A failed database write is logged and never blocks or changes the match.

### Authentication

Login uses server-side sessions instead of JWT, so logging out really revokes access and no signing secret is needed. The server issues a random token and stores only its hash in `auth_sessions`; logging out deletes the row, and expired rows are removed periodically. This login session is separate from the in-memory reconnect token that keeps a player in a match.

### Access rights and backups

- The backend connects with an application role that may only read and insert rows in `matches` and `match_players` and may truncate no table.
- A separate administrator role runs the migrations, prunes the match log, and removes expired sessions.
- Development backups use `pg_dump`; a production deployment uses continuous WAL archiving for point-in-time recovery. In development, `docker compose down -v` deletes the database volume.

### Deferred

Email verification, password reset with email delivery, and protection against XP farming are not part of the current scope. The XP awarded per match and the level thresholds are still open.

## 3. Intelligent Player Approach

The intelligent player is a modular decision component that plays through the same action interface as a human player.

### Information rules

The bot only uses information that a human player in the same seat would have: its own hand, the public state, the public effect history, the results of its own Spy cards, and the cards it gave and received in Swaps it took part in. It never reads other players' hands from the server state.

### Bot levels

1. **Random bot**: chooses uniformly from the legal actions. Used as a baseline.
2. **Rule-based bot**: fixed priorities, for example to play combos first, keep +2 cards to answer a penalty, give away its least useful card with Swap, and use Color Change on the color it holds most.
3. **Heuristic bot**: scores each legal action by hand-size reduction, color continuity, the penalty situation, the opponents' hand sizes, and information gained from Spy.
4. **Optional – sampling bot**: samples possible hidden hands consistent with the known information, simulates the outcomes with the engine, and chooses the best average action (determinized Monte Carlo search).

Learning during runtime is outside the current scope.

### Decision points

- Which card or combo to play, or whether to draw voluntarily and keep the hand for later turns.
- Whether to continue a +2 chain or draw the penalty.
- Which color to choose after Color Change.
- Which target and which own card to choose for Swap. The blind position pick carries no information, so the bot picks a position at random.
- When to play Storm, which affects every opponent but not the bot itself.
- Which target to choose for Spy.

## 4. Measurement Method

The bots are evaluated with a headless simulator that runs complete matches with the engine, without Socket.IO.

### Metrics

- Average finishing position, normalized by player count.
- Win rate with a 95% confidence interval.
- Average decision time and maximum decision time.
- Number of rejected actions (expected to be 0).
- Results by player count (2–8) and by seat.
- Frequency of blocked games and forfeits.

### Measurement setup

- Run each comparison for a fixed number of matches with fixed seeds, so the results are reproducible.
- Compare every bot level with the random and the rule-based baselines.
- Rotate seats so that the starting seat does not bias the results.
- Record results per match and per action.

## 5. Data Needed for Evaluation

The headless simulator records the following data in its own output files; it is not stored in PostgreSQL.

- Per match: seed, player count, bot level per seat, finishing order, and end reason.
- Every action with the random values selected for it, so a simulated match can be replayed.
- The available legal actions at each decision and the chosen action.
- Decision timing.
- Storm values with requested and actual draw amounts after the hand limit.
- Reshuffle events and whether a new deck was added.
- +2 chain lengths and outcomes.
- Forfeits, and spectator or leave events.

## 6. Success Criteria

The intelligent player is considered acceptable if it:

- Never submits a rejected action.
- Completes every decision within the turn timer, with an average well below it.
- Achieves a better average finishing position than the random baseline, with a statistically significant difference.
- Produces stable results across repeated runs with different seeds.
- Handles +2 chains, Swap, Spy, and Color Change correctly.

## 7. Open Questions

- Should the bot be playable in the final version as a seat filler, or used only for testing and evaluation?
- Should the bot optimize only for winning, or also for realistic, human-like play?
- Which metrics matter most for the thesis evaluation?
