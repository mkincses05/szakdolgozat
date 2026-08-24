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
- `active_turn -> active_turn` after a normal resolved turn
- `penalty_resolution -> active_turn` after the penalty is paid or extended
- `active_turn -> finished` when a player wins

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

## 4. Server Responsibilities

- Maintain room and match state
- Validate all gameplay actions
- Broadcast authoritative updates
- Handle disconnects and reconnects
- Prevent race conditions during state transitions
- Check win conditions after every resolved turn

## 5. Initial Implementation Notes

- Keep state transitions centralized in one service
- Use typed event payloads
- Store only the minimum live state in memory
- Persist match history separately if needed
- Log invalid actions for debugging and balancing

## 6. Risks
- Out-of-order events
- Partial reconnects
- Desync between client and server state
- Concurrent actions during phase changes
- Incorrect handling of penalty chains