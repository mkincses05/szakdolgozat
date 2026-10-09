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
- `active_turn -> finished` after the complete turn effect resolves and the active player's hand is empty

## 2. Socket.IO Event Strategy

Socket.IO should be used for real-time synchronization, room updates, and gameplay actions.

### Connection lifecycle
- On connect, the client receives the current room or session snapshot
- On reconnect, the server resends authoritative state
- On disconnect, the server keeps the player in a temporary offline state if appropriate


## 3. Validation Rules

- Reject actions that are not valid in the current state
- Reject actions from players who are not part of the match
- Prevent duplicate submissions
- Ensure that host-only actions remain host-only
- Keep payloads small and explicit
- When no legal card exists, draw one card and end the turn; pass if no card can be drawn
- Resolve the complete card effect before checking the win condition
- Do not create a next turn after a successful win check

## 4. Server Responsibilities

- Maintain room and match state
- Validate all gameplay actions
- Broadcast authoritative updates
- Handle disconnects and reconnects
- Prevent race conditions during state transitions
- Resolve a card or combo completely before checking the win condition
- Check the active player's hand only after all effects of the turn have finished
- Advance to the next player only when the post-effect win check finds no winner

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
4. Set the session to `finished` if it is empty; otherwise select the next player.

Consequently, a last-card Storm is not an immediate win because its effect gives the Storm player one card before the check. For Swap, the exchange is skipped when either participant has no card to exchange after the played Swap has been removed from the active player's hand; the post-effect win check still runs.

## 6. Risks
- Out-of-order events
- Partial reconnects
- Desync between client and server state
- Concurrent actions during phase changes
- Incorrect handling of penalty chains