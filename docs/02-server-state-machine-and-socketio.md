# Server State Machine and Socket.IO Event Plan

The server is the single source of truth. Every client action is validated against the current authoritative state. Rule IDs (R1–R25) refer to `docs/01-game-analysis-and-design.md`.

## 1. State Model

Room state, match state, and player status are kept separate.

### Room states

- `lobby`: members join and leave; the host can start a match.
- `in_match`: a match is running in the room.
- `closed`: the last member has left; the room is removed.

Transitions:

- `lobby -> in_match` when the host starts a match with 2–8 members (R1).
- `in_match -> lobby` after the match has ended, so the host can start a new match.
- `lobby -> closed` and `in_match -> closed` when the last member leaves.

### Match phases

- `dealing`: the deck is shuffled, hands are dealt, the starting card and the first player are selected (R3).
- `awaiting_action`: the current player must play, draw, or pass.
- `ended`: the final results are fixed; no further actions are accepted.

Transitions:

- `dealing -> awaiting_action` after setup.
- `awaiting_action -> awaiting_action` after a resolved turn when at least two active players remain.
- `awaiting_action -> ended` when R18 or R21 applies, including after a forfeit (R23).

Color Change colors, Swap and Spy targets, and both Swap selections are part of the play payload, so every play resolves in a single step without waiting for another player. An active +2 penalty is stored in the `pendingPenalty` field, not as a separate phase.

### Player status

Each player has two independent fields:

- **Match status**: `active`, `finished`, or `forfeited`.
- **Presence**: `connected`, `disconnected`, or `left`.

A `finished` player who is `connected` is a spectator. A `disconnected` player stays `active` during the reconnect grace period, but their turns are skipped and they cannot be selected as targets (R23).

## 2. Socket.IO Events

Each client action carries an `actionId` (a client-generated UUID) and the `stateVersion` the client last received. The server answers every action with an acknowledgement: `{ ok: true }` or `{ ok: false, code }`, where `code` is a stable error key that the client translates with i18n.

### Client → server

| Event | Payload | Notes |
| --- | --- | --- |
| `room:create` | `displayName` | Creates a room; the creator is the host. |
| `room:join` | `roomCode`, `displayName` | Rejected when the room is full (R1) or in a match. |
| `room:leave` | — | Triggers host transfer (R24) or a forfeit (R23). |
| `room:start` | — | Host only; requires 2–8 members. |
| `game:play` | `cardIds[]`, `chosenColor?`, `targetPlayerId?`, `swapCardId?`, `targetCardPosition?` | One special card or a number combo (R8, R9). For Swap, `swapCardId` is the acting player's card and `targetCardPosition` is the blindly picked face-down position (R12). |
| `game:draw` | — | Voluntary or forced draw (R15), pass (R17), or drawing a +2 penalty (R10). |
| `session:resume` | `reconnectToken` | Reconnects a player within the grace period. |

### Server → client

| Event | Recipient | Content |
| --- | --- | --- |
| `room:state` | Room members | Members, host, room state. |
| `game:state` | Each player separately | Personal view (see section 3) and `stateVersion`. |
| `game:effect` | All players | Public effect summary, for example the Storm value with requested and actual draws per player, the hand-limit cap, a reshuffle, or a new deck added. |
| `game:spyReveal` | Spy player only | Snapshot of the target's hand (R14). |
| `game:swapResult` | Swap participants only | The card each participant received (R12). |
| `game:ended` | All players | Winner, finishing order, forfeits, blocked-game ranking. |

### Duplicate and out-of-order actions

- An action whose `actionId` has already been processed returns the original acknowledgement without changing the state.
- An action whose `stateVersion` is not the current version is rejected with `stale_state`.
- Each accepted action increments `stateVersion` exactly once.
- Actions for one match are processed sequentially, so concurrent actions cannot interleave.

## 3. Visibility Rules (R25)

- Each player receives their own hand, the other players' hand sizes, the top card, the active color, `pendingPenalty`, the current player, the turn deadline, the draw-pile size, and the finishing order.
- Spectators receive the same public state without any hand.
- Spy snapshots are sent only to the Spy player.
- During a Swap, the acting player sees the target's hand only as face-down positions. The server maps `targetCardPosition` to a card through a fresh random permutation at resolution time, so the hand order never leaks information. Only the two participants learn which cards were exchanged.
- Private data is never broadcast to a room; personal views are sent to individual sockets.

## 4. Timers

All values are configurable; the defaults are:

| Timer | Default | On expiry |
| --- | ---: | --- |
| Turn timer | 60 s | Draw the pending +2 penalty, otherwise draw one card or pass (R22). |
| Reconnect grace period | 60 s | The player forfeits (R23). |

Timer expiry is processed as a server-generated action with the same validation, versioning, and sequential processing as client actions; it is equivalent to a `game:draw` from the current player, except that a player with 20 cards passes even if they hold a legal card (R22). When a disconnected player faces a pending +2 penalty, the server draws it for them in the same way (R10).

## 5. Validation Rules

- Reject actions that are not valid in the current room state or match phase.
- Reject actions from players who are not part of the match, or whose match status is not `active`.
- Reject gameplay actions from players who are not the current player.
- Enforce 2–8 players when starting the match (R1).
- Keep host-only actions host-only (R24).
- Validate legality with R4–R9 and the hand limit with R16.
- Treat `game:draw` as a penalty draw while a +2 penalty is pending (R10). Otherwise it is a draw (R15), or a pass when the player holds 20 cards and has no legal card (R17). Reject it when the player holds 20 cards and has a legal card.
- Reject Swap and Spy targets that are not active and connected (R12, R14, R23). A Swap or Spy card is not a legal card when no such target exists (R9).
- Every Swap requires a valid `targetPlayerId` (R9). Reject a Swap without `swapCardId` or `targetCardPosition`, unless the Swap is the acting player's last card (R12). `targetCardPosition` must be within the target's hand size.
- Reject a `game:play` with `chosenColor` missing for Color Change, or present for other cards.

## 6. Turn Resolution

The server applies the turn resolution contract from `docs/01` (section 6) atomically. Random values (shuffles, Storm values, the Swap position permutation) come from an injectable, seedable random number generator. Each value is selected exactly once and recorded in the action log, so a match can be replayed deterministically.

## 7. Implementation Notes

- Keep state transitions in one match service; the engine is a pure function from state and action to the new state and the events to send.
- Use typed and validated event payloads shared between the client and the server.
- Keep the live match state in memory and append every accepted action to the PostgreSQL action log (`docs/03`).
- Log rejected actions with their error code for debugging and balancing.

## 8. Risks

- Out-of-order or duplicate events.
- Partial reconnects and timers expiring during a reconnect.
- Desync between client and server state.
- Concurrent actions during phase changes.
- Incorrect handling of penalty chains or of a penalty pending at match end.
- Incorrect Storm randomization or applying different requested amounts to different players.
- Incorrect enforcement of the 20-card hand limit.
- Incorrect handling of the 25-card reshuffle threshold or a reshuffle in the middle of an effect.
- Leaking private hands to other players or spectators.
- Finished or forfeited players receiving turns or effects.
- Incorrect match termination after the first winner, a forfeit, or a blocked game.
