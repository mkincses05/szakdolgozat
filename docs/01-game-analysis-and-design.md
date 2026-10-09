# Similar Games Comparison, State Machine, Page Flow, Data Model, Event Protocol Sketch, and Test Plan

## 1. Similar Games Comparison

This project can be positioned among multiplayer card games with turn-based interaction, hidden information, and lightweight tactical decisions. The main reference points are:

### A. Classic turn-based card games
- Simple legal-move rules
- Short decision windows
- Easy-to-read turn structure

### B. Party-style multiplayer card games
- Fast pacing
- Social interaction
- Punishment / interruption mechanics
- Strong emphasis on disruption and comeback potential

### C. Hidden-information multiplayer games
- Players do not know everything about other players' hands or intentions
- Information gathering can be a meaningful action
- Server-side authority is important for fairness

Compared with these, this project adds a custom rule system with:
- combo / chain reactions
- stackable penalties
- special cards with global effects
- a risk action that changes turn strategy

## 2. State Machine Overview

The game can be described as a finite state machine.

### Main states
1. **Lobby**
   - Players join a room
   - Host can configure or start the match

2. **Dealing / Setup**
   - Cards are distributed
   - Starting card is selected
   - Initial turn order is prepared

3. **Active Turn**
   - The current player selects a legal action
   - A card, combo, special card, or risk action may be resolved

4. **Penalty Resolution**
   - Used when a stackable +2 chain is active
   - The next player must either continue the chain or draw the accumulated cards

5. **Round Resolution**
   - The played card or combo is committed
   - The complete card effect is applied
   - A player with an empty hand is checked for victory
   - The next player is selected only if nobody has won

6. **Game End**
   - A player reaches zero cards
   - Final result is broadcast

## 3. Page Flow

A simple page flow is enough for the current scope:

- **Landing page**
- **Room / lobby page**
- **Game setup / waiting page**
- **Gameplay page**
- **Result page**

Most of the game should happen inside the gameplay page, while navigation between pages should be kept minimal.

## 4. Data Model

The first version of the data model should include the following main entities:

### Player
- id
- displayName
- connection status
- hand size
- current room

### Room
- id
- hostId
- player list
- status
- createdAt

### GameSession
- id
- roomId
- state
- currentPlayerId
- activeColor
- activePenalty

### Card
- id
- type
- color
- value or effect type

### Turn / Action
- id
- playerId
- actionType
- payload
- timestamp

### MatchResult
- id
- sessionId
- winnerId
- finalState
- summary


## 5. Test Plan

### Functional tests
- Room creation and joining
- Game start and dealing
- Legal card play validation
- Combo resolution
- Special card effects
- Risk action restrictions
- Win condition handling

The following cases are mandatory acceptance tests for the engine and server:

- A player with no legal card draws one card and the turn ends.
- A player with no legal card passes when the draw pile and reshuffle cannot provide a card.
- A last-card Storm resolves its draw effect before the win check, so the Storm player does not win from that play.
- A last-card Swap skips the exchange when either participant has no card to exchange, then the empty hand is checked for victory.
- A player who is empty after all effects is moved to `finished`, and no next turn is created.

### Protocol tests
- Event payload validation
- Duplicate action rejection
- Invalid state rejection
- Host-only command enforcement

### Integration tests
- Multiple clients in one room
- Turn synchronization between clients and server
- Reconnect handling
- Penalty stacking behavior

### Edge cases
- Empty draw pile and reshuffle behavior
- No legally playable card: draw one card and end the turn; pass if no card can be drawn
- Win checks happen only after the complete effect of the turn
- A last-card Storm draws a card before the win check, so it does not automatically win
- A last-card Swap skips the exchange if either participant has no card, then performs the win check
- Player disconnect during turn
- Simultaneous actions during state transitions
- End-game triggered during a chained action

### Turn resolution contract

The engine, server and tests must use the same order for every turn:

1. Commit the played card or combo to the discard pile.
2. Resolve every effect caused by that play.
3. Check the active player's hand size.
4. If the hand is empty, transition to `Game End` and do not create another turn.
5. Otherwise, select the next player.

For a normal turn with no legally playable card, the player draws one card and the turn ends. If reshuffling cannot produce a card, the player passes without drawing. A Swap effect is conditional: if either participant has no card after the Swap card has left the active player's hand, no exchange occurs.

## 6. Open Questions
- Exact number of players supported
- Whether late join is allowed
- Whether reconnect restores hidden information fully
- How much state should be persisted between matches
- Whether bot players are part of the first version