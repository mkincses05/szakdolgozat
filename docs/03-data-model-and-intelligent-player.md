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
- `turnDeadline`
- `stateVersion`
- `processedActionIds`: recently processed action IDs for duplicate detection
- `seed`: seed of the random number generator
- `finishingOrder`
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

| Table | Content |
| --- | --- |
| `users` | Guest identity: ID, display name, reconnect token hash, creation time |
| `rooms` | Room ID, code, host, creation time, close time |
| `matches` | Match ID, room ID, seed, player count, start and end time, end reason (`last_player`, `blocked`, `forfeits`) |
| `match_players` | Match ID, user ID, seat, final status, finish position, whether the player was a bot |
| `match_actions` | Match ID, sequence number, player ID, action type, payload, random values selected, timestamp |

Players join as guests with a display name. The server issues a reconnect token that identifies the player after a disconnect. User registration is not part of the current scope.

The `match_actions` log together with the seed allows every match to be replayed, which supports debugging and the bot evaluation in section 4.

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

- The `matches`, `match_players`, and `match_actions` records.
- The available legal actions at each decision and the chosen action.
- Decision timing.
- Storm values with requested and actual draw amounts after the hand limit.
- Reshuffle events and whether a new deck was added.
- +2 chain lengths and outcomes.
- Finishing order, forfeits, and spectator or leave events.

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
