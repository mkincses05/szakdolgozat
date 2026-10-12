# Initial Server State Machine and Socket.IO Event Plan

## 1. Server-Side State Machine

The server should be the single source of truth. Every client action must be validated against the current authoritative state.

### Server states
- `idle`
- `lobby`
- `dealing`
- `active_turn`
- `penalty_resolution`
- `finished`

### Transition outline
- `idle -> lobby` when a room is created
- `lobby -> dealing` when the host starts the match
- `dealing -> active_turn` after cards and the starting card are initialized
- `active_turn -> penalty_resolution` when a +2 chain becomes active
- `active_turn -> active_turn` after a normal resolved turn when nobody has won
- `penalty_resolution -> active_turn` after the penalty is paid or extended
- `active_turn -> active_turn` after a player finishes, while more than one active player remains
- `active_turn -> finished` when only one active player remains

Each player has an independent status: `active`, `finished`, `spectating`, or `disconnected`. A finished player may stay connected as a spectator or leave the room. The session remains active while at least two active players remain.

## 2. Socket.IO Event Strategy

Socket.IO should be used for real-time synchronization, room updates, and gameplay actions.

### Connection lifecycle
- On connect, the client receives the current room or session snapshot
- On reconnect, the server resends authoritative state
- On disconnect, the server keeps the player in a temporary offline state if appropriate


## 3. Validation Rules

- Reject actions that are not valid in the current state
- Reject actions from players who are not part of the match
- Enforce a minimum of 2 and a maximum of 8 players per room
- Reject gameplay actions from players with `finished` or `spectating` status
- Prevent duplicate submissions
- Ensure that host-only actions remain host-only
- Keep payloads small and explicit
- Enforce a hard maximum hand size of 20 cards for every card-drawing effect
- When no legal card exists, draw one card and end the turn; pass if no card can be drawn
- Resolve the complete card effect before checking the win condition
- Remove a finished player from the turn order after a successful finish check
- Skip finished, spectating, and disconnected players when selecting the next active player
- End the match only when one active player remains
- End the Spy player's turn after the Spy effect is resolved

## 4. Server Responsibilities

- Maintain room and match state
- Validate all gameplay actions
- Broadcast authoritative updates
- Handle disconnects and reconnects
- Prevent race conditions during state transitions
- Resolve a card or combo completely before checking the win condition
- Check the active player's hand only after all effects of the turn have finished
- Advance only to an active player after a post-effect finish check
- Broadcast spectator state and the current finishing order to finished players
- Reveal Spy information only to the player who played the Spy
- When the draw pile is empty, add a new 104-card deck if 25 or fewer reusable discard cards are available

## 5. Initial Implementation Notes

- Keep state transitions centralized in one service
- Use typed event payloads
- Store only the minimum live state in memory
- Persist match history separately if needed
- Log invalid actions for debugging and balancing

### Turn resolution rules

The authoritative server must apply this sequence atomically:

1. Move the played card or combo to the discard pile.
2. Resolve all resulting effects.
3. Check whether the active player's hand is empty.
4. If it is empty, mark that player as finished and remove them from the active turn order.
5. Select the next active player if at least two active players remain.
6. Set the session to `finished` when only one active player remains.

Consequently, a last-card Storm is not an immediate win because its effect requests the same randomly selected amount from every active player before the check; the actual amount may be reduced individually by the 20-card hand limit. For Swap, the exchange is skipped when either participant has no card to exchange after the played Swap has been removed from the active player's hand; the post-effect win check still runs.

Storm affects active players only. For each Storm, the server must randomly select one integer from 1 to 3 exactly once and use that same value as the requested amount for every active player. The actual amount drawn may differ per player because of the 20-card hand limit. Finished players may observe all public state updates, but they cannot perform gameplay actions or be selected by Swap or Spy.

The 20-card hand limit has priority over every effect. A Storm uses its shared value as the maximum requested amount, but each active player draws only as many cards as fit in their own hand. A player with 19 cards can therefore draw only 1 card from a Storm with value 3, while a player with 10 cards draws all 3. Cards that do not fit remain in the draw pile. If a +2 reaches the hand limit, the player draws the cards that fit and the penalty is completed.

When the draw pile is empty, the top discard remains in play and the other discarded cards become reusable. If more than 25 reusable cards are available, they alone are shuffled into the new draw pile. If 25 or fewer are available, a new 104-card deck is added before shuffling the reusable cards into the draw pile.

## 6. Risks
- Out-of-order events
- Partial reconnects
- Desync between client and server state
- Concurrent actions during phase changes
- Incorrect handling of penalty chains
- Incorrect Storm randomization or applying different draw amounts to different players
- Incorrect enforcement of the 20-card hand limit
- Incorrect handling of the 25-card reshuffle threshold
- Incorrect player-count validation
- Finished players receiving turns or gameplay effects
- Incorrect match termination after the first winner