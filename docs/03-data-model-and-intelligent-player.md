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
- `members`: user IDs in join order, used for host transfer (R24) and as the seat order; bots are members too
- `bots`: the computer players added by the host, with their generated ID, display name (`Bot 1`, `Bot 2`, ...), and level
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
- `endReason`: `last_player`, `blocked`, `forfeits`, or `no_humans` once the match has ended
- `startedAt`, `endedAt`

#### MatchPlayer

- `userId`, `seat`
- `hand`: list of cards (sent only to the owner)
- `matchStatus`: `active`, `finished`, or `forfeited`
- `presence`: `connected`, `disconnected`, or `left`
- `finishPosition`
- `isBot`, `botLevel`: `random`, `rule_based`, `heuristic`, or `sampling` for bots, empty for humans

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
| `matches` | Match ID, seed, player count (2–8), turn time limit, start and end time, end reason (`last_player`, `blocked`, `forfeits`, `no_humans`, or `aborted`), winner seat (empty when there is no winner) |
| `match_players` | Match ID, seat, player kind (`guest`, `registered`, or `bot`), user ID (registered players only), bot level (bots only), display name at match time, final status, finish position (empty only for unranked players of an aborted match), XP earned |
| `schema_migrations` | Applied migration versions with their application time |

### Constraints

- The XP and counter columns of `users` cannot be negative, and `wins + forfeits` cannot exceed `matches_played`.
- The primary key of `match_players` is the match ID and the seat. A user appears at most once per match, and several players can share a finish position after a blocked game (R18).
- Only registered players have a user ID and earned XP in `match_players`; only bots have a bot level.
- Deleting a match deletes its `match_players` rows. Deleting a user sets the user ID to empty in the log and deletes the user's credentials and sessions. Neither deletion changes any other user's counters.
- `aborted` marks a match stopped without a regular end: on a graceful server shutdown, running matches are stored as aborted. Players who were still playing or had forfeited have no finish position in an aborted match, because forfeits are ranked only when a match ends (R23); a finished player always has one.

### Writing the result of a match

When a match ends, the server writes the `matches` row, every `match_players` row, and the counter updates of all registered participants in a single transaction. Counters are increased atomically in SQL (for example `xp = xp + $1`), never read, changed, and written back. Only the player alone in first place counts a win: after a blocked game in which no one finished, the remaining players share first place, the match has no winner seat, and nobody's `wins` increases (they still earn XP for their position). An `aborted` match is logged but does not change any counter. A failed database write is logged and never blocks or changes the match.

### Experience points

A registered player earns 10 XP for a match plus 10 XP for every player who finished behind them; a forfeit earns nothing. Players who share a position after a blocked game (R18) are not behind each other. For example, in a 4-player match the positions 1 to 4 earn 40, 30, 20, and 10 XP. Guests, bots, and aborted matches earn no XP. Bots count like any other player for the positions, so a registered player also earns XP for every bot that finished behind them. The rule is `getMatchXp` in `shared/`.

### Authentication

Login uses server-side sessions instead of JWT, so logging out really revokes access and no signing secret is needed. This login session is separate from the in-memory reconnect token that keeps a player in a match.

- Registration needs a username (3–32 letters, digits, `.`, `_`, or `-`, never `@`), an email address, a display name, and a password of 8–128 characters. Usernames and emails are unique regardless of case. Registering also logs the user in.
- A user logs in with the username or the email address; a value containing `@` is treated as an email. A wrong username, email, or password gives the same `invalid_credentials` answer.
- Passwords are stored as argon2id hashes in `user_credentials`.
- The server issues a random 32-byte token and stores only its SHA-256 hash in `auth_sessions`. The browser receives the token in the `wildhand_session` cookie, which is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- A session expires after 30 days without use. An HTTP request with the cookie, such as loading the profile, moves the expiry to 30 days later, at most once a day, and renews the cookie with it. A Socket.IO handshake only checks the session and never moves the expiry, because it cannot renew the cookie. Logging out deletes the row; expired rows of a user are deleted when that user logs in.
- The Socket.IO connection reads the cookie when it connects. A logged-in player joins rooms under the account's display name instead of the typed name, and one account can take only one seat in a room (`account_already_in_room`). Logging in or out takes effect when the client reconnects.
- Without a database, the account API answers `database_unavailable` and every player plays as a guest. Every connection attempt and query times out after 5 seconds, so an unreachable database never keeps a player waiting: the player then connects as a guest, and the account API answers `database_unavailable` as if there were no database. Other unexpected errors still answer `internal_error`.

The account API is served by Express under `/api/auth`; every response has the shape of a Socket.IO acknowledgement (`{ ok: true, data }` or `{ ok: false, code }`):

| Request | Result |
| --- | --- |
| `POST /api/auth/register` | 201 with the profile and the cookie; 400 `invalid_payload`, 409 `username_taken` or `email_taken` |
| `POST /api/auth/login` | 200 with the profile and the cookie; 401 `invalid_credentials` |
| `POST /api/auth/logout` | 200; deletes the session and the cookie |
| `GET /api/auth/me` | 200 with the own profile (username, email, display name, XP, matches played, wins, forfeits); 401 `not_logged_in` |

### Access rights and backups

- The backend connects with an application role that may only read and insert rows in `matches` and `match_players` and may truncate no table.
- A separate administrator role runs the migrations, prunes the match log, and removes expired sessions.
- Development backups use `pg_dump`; a production deployment uses continuous WAL archiving for point-in-time recovery. In development, `docker compose down -v` deletes the database volume.

### Deferred

Email verification, password reset with email delivery, and protection against XP farming are not part of the current scope. The level thresholds are still open.

## 3. Intelligent Player Approach

The intelligent player is a modular decision component that plays through the same action interface as a human player. The host adds bots in the lobby and chooses one of four levels per bot; bots take seats like human members and count towards the 2–8 player limit (R1). The code is in `backend/src/bots/`, the live-match integration in `backend/src/game/bot-driver.ts`.

### Information rules

The bot only uses information that a human player in the same seat would have: its own hand, the public state, the public effect history, the results of its own Spy cards, and the cards it gave and received in Swaps it took part in. It never reads other players' hands from the server state.

The rule is enforced by the structure, not only by convention. A bot has no socket: the match controller hands every message addressed to a bot to its driver, so the bot receives exactly the messages a human client in its seat would receive. From them the bot builds its memory (`BotMemory`):

- the discard pile since the last recycling, from the played cards of the public effects (R19);
- the number of decks in play, from the reshuffle effects;
- the cards known to be in other hands: a Spy snapshot of the whole hand, and the card given away in an own Swap. A known card is forgotten when its holder plays it, and all knowledge of two other players is dropped after a blind Swap between them;
- the forfeit order;
- inferences from draws (`HandConstraint`): a player who drew a card or passed could not play on the table they saw, and a player who drew a +2 penalty held no +2. An inference covers the cards held at that moment and weakens with every card the player plays or gives away, because each of them may have been one of those cards; a Spy snapshot replaces it. The inference assumes that a player draws only when they must, so a voluntary draw makes it wrong; this only makes the bot's estimates less accurate, never its actions illegal.

The cards the bot has not seen are every card of the decks in play except its own hand and the discard pile. They are in other hands, in the draw pile, or in removed forfeited hands.

### Legal actions

All levels choose from the same list, `getLegalActions` in `shared/`, which is built from the bot's own view with the shared rule helpers (`getLegalCards`, `getComboPartners`, `getSwapOffers`, `getValidTargets`, `getDrawOption`). The actions are canonical:

- Plays that differ only in interchangeable copies of a card are listed once.
- A number combo is described by the number of cards of each color and the color of its last card, which becomes the top card (R8); the order of the middle cards does not matter.
- Color Change is listed once per color, Spy once per target, and Swap once per target and distinct card given away.
- The blind Swap position is not part of an action: it carries no information (R12), so it is chosen at random when the action is sent.
- Drawing (or passing, or drawing the penalty) is one action whenever `game:draw` is allowed.

A test plays seeded random matches with 2–8 players and checks at every turn that the engine accepts every listed action, that every legal card starts at least one action, and that the draw action is listed exactly when drawing is allowed.

### Bot levels

1. **Random bot**: chooses uniformly from the canonical legal actions. Used as a baseline. Because drawing is always one of the actions, it often draws although it could play.
2. **Rule-based bot**: a plain list of fixed priorities, first match wins (`chooseBySimpleRules`):
   1. a +2 penalty is answered with a +2 (chain), otherwise the penalty is drawn;
   2. the first playable number card, alone: this level never plays combos;
   3. Swap, Color Change (to the color the bot holds most), Spy, Storm, then a +2, which is kept until now to answer a penalty, each with the first target and the first card to give away;
   4. drawing only when nothing can be played.

   An earlier, fuller rule list (`chooseByRules`) also chose the longest combo and attacked opponents close to finishing, but it was nearly as strong as the heuristic bot (`docs/05`, entry 13). It is now only the playout policy of the sampling bot:
   1. a +2 penalty is answered with a +2 (chain), otherwise the penalty is drawn;
   2. when the next player has 2 cards or fewer, a +2 or Storm is played on them;
   3. the longest number combo, ending on the color the bot holds most;
   4. Swap, giving away the least useful card to the opponent with the fewest cards;
   5. Color Change to the color the bot holds most;
   6. Spy on the opponent with the fewest cards;
   7. Storm, then a +2;
   8. drawing only when nothing can be played.
3. **Heuristic bot**: scores each legal action with a weighted evaluation of the situation after it and plays the best one. The features are the number of turns still needed to empty the hand (one per group of number cards with the same number and one per special card, because one turn plays a whole combo or one special card), the change of the hand size, the share of the remaining hand that could follow the new top card, the number of +2 and wild cards kept in reserve, the pressure of an attack on opponents close to finishing, the usefulness of the card given away with Swap, the value of Spy information about an opponent whose hand is not known yet, and the chance of blocking the next player. The blocking chance is the probability that the next player cannot follow the new top card, estimated from the unseen cards, their known cards, and their inferences; it is multiplied by the cards they would have to draw and by how close they are to finishing. The weights (`DEFAULT_HEURISTIC_WEIGHTS`) were tuned with the simulator (section 4); the measurements are in `docs/05-bot-measurement-log.md`. The level-3 bot plays with these weights but without blocking (`LEVEL_3_WEIGHTS`): it weighs its own hand and does not use the inferences about the opponents' hands, which remain the advantage of level 4. With blocking, level 3 was much closer to level 4 than to level 2; without it, the two upper steps are about equal (`docs/05`, entry 18). The full weights, with blocking, are still used by the sampling bot to pre-select its candidates.
4. **Sampling bot**: determinized flat Monte Carlo search, also called Perfect Information Monte Carlo (PIMC). One iteration:
   1. draws one complete state consistent with the bot's knowledge (a determinization): its own hand, the known cards of other players, every hand size, and the draw-pile size are kept; the unseen cards are dealt randomly to the other hands, the draw pile, and the removed hands, and a hand with inferences gets cards that fit them whenever such cards are left;
   2. applies every candidate action to that same state and plays the game forward with the fuller rule list (`chooseByRules`) for every player (40 actions by default);
   3. scores the outcome for the bot between 1 (first place) and 0 (last place); a player who has not finished is ranked among the active players by the number of turns they still need to empty their hand, which predicted the finishing order better than the hand size.

   All candidates of an iteration share the same determinization and the same random seed (common random numbers), so they are compared under equal conditions. When there are more than 8 legal actions, the heuristic bot's best 8 are the candidates. Iterations run until the time budget (`BOT_SAMPLING_BUDGET_MS`, 400 ms by default) is used up, and at most 1000 times; the action with the best average wins. For measurements, `maxPlayouts` limits the search by the number of playouts instead of by time, so the result does not depend on the machine's load. Dropping weak candidates early (successive halving) was tried and did not improve the bot, so it was removed (`docs/05`, entry 14).

   Known limitation: every determinization is played as if the hidden cards were visible ("strategy fusion"), so the bot never plays to gather information on purpose. An Information Set Monte Carlo Tree Search (ISMCTS), which builds one search tree over the bot's information set and also searches the opponents' replies, was implemented and measured: it was weaker than the flat search, most likely because the flat search compares the candidates on the same determinizations (`docs/05`, entry 19). It was removed afterwards.

Every bot has its own random number generator, seeded from the match seed and its seat. It never uses the match's generator, so a match stays reproducible from its seed and its actions. Learning during runtime is outside the current scope.

### Live matches

The driver of a bot waits a short thinking time when the bot is on turn (0.7–1.4 s by default), so human players can follow the moves, then decides on the latest view and sends the decision through the same match actions as a human. A decision made for an older state version is dropped. The turn timer applies to bots too. The room service handles every room on one thread, so the sampling bot's search runs in a pool of worker threads (`BOT_SAMPLING_WORKERS`, 2 by default; `backend/src/bots/sampling-pool.ts`). The worker gets a plain copy of the bot's view and memory and a seed drawn from the bot's own generator, so it still uses only what the bot knows. While a worker searches, the server thread stays free: a 400 ms decision held up the server thread for about 0.4 s without workers and for at most about 20 ms with them. With 0 workers the search runs on the server thread. Tests and the simulator always search on the calling thread, so their results stay reproducible.

When no human is left in the room, a running match ends with the end reason `no_humans` and is stored, and the room closes (R21). Bots never become the host (R24) and are always connected. In the results they are stored with the player kind `bot` and their level.

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

- Average finishing position, normalized by player count: 0 for always first, 1 for always last, 0.5 for equal strength.
- Win rate with a 95% confidence interval, compared with the win rate of an equally strong player (1 / number of players).
- Average decision time and maximum decision time.
- Number of rejected actions (expected to be 0).
- Results by player count (2, 4, and 8 players in the large measurement).
- Frequency of blocked games.

### Measurement setup

- Run each comparison for a fixed number of matches with fixed seeds, so the results are reproducible.
- Compare every bot level with every lower level, with one bot of the stronger level against bots of the lower level.
- Rotate seats so that the starting seat does not bias the results.
- Limit the sampling bot by a fixed number of playouts per decision (`--max-playouts`) instead of by time, so the result does not depend on the machine or its load and runs can go in parallel.
- Log every measurement during development in `docs/05-bot-measurement-log.md`, so the development of the bots can be followed.

The tournament is `backend/tools/simulate/tournament.ts`; `backend/tools/simulate/tune.ts` tunes the heuristic bot's weights.

## 5. Data Needed for Evaluation

The tournament prints a summary and, with `--out`, writes a JSON file; nothing is stored in PostgreSQL. The raw results of the measurements are kept locally, outside the repository.

- Per match: seed, bot level per seat, finishing position per seat, end reason, number of actions, and rejected actions.
- Per level: matches played, average normalized position with its confidence interval, win rate with its confidence interval, forfeits, and average and maximum decision time.
- Per run: the settings, the end reasons, and the number of rejected actions.

Single actions, Storm values, reshuffles, and +2 chains are not recorded. They are not needed for comparing the levels, and a match can be replayed from its seed to inspect them: the match and every bot draw their random numbers from generators seeded from it, so a run limited by playouts plays exactly the same matches again.

## 6. Success Criteria

The intelligent player is considered acceptable if it:

- Never submits a rejected action.
- Completes every decision within the turn timer, with an average well below it.
- Achieves a better average finishing position than the random baseline, with a statistically significant difference.
- Produces stable results across repeated runs with different seeds.
- Handles +2 chains, Swap, Spy, and Color Change correctly.

All criteria are met (`docs/05`, entry 20): no rejected action in 13,500 matches; the slowest level decides in about 0.25–0.4 s against a 30 s turn timer; every level beats the random baseline and every lower level significantly with 2, 4, and 8 players; repeated measurements with other seeds agree within their confidence intervals; and the special cards are covered by the tests of the legal actions, which check against the engine that every listed action is accepted.

## 7. Decisions

The open questions of the plan were decided as follows:

- **Seat filler or test tool:** bots are part of the final game. The host adds them in the lobby with one of four levels, and they also serve the measurements.
- **Winning or human-like play:** the bots play to win. They are not modeled on human players; they only wait a short thinking time before each move, so humans can follow the game.
- **Metrics for the evaluation:** the average normalized finishing position and the win rate with 95% confidence intervals, compared with an equally strong player, for each pair of levels and for 2, 4, and 8 players.
