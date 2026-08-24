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
   - Turn effects are applied
   - Next player is selected
   - Win condition is checked

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
- Player disconnect during turn
- Simultaneous actions during state transitions
- End-game triggered during a chained action

## 6. Open Questions
- Exact number of players supported
- Whether late join is allowed
- Whether reconnect restores hidden information fully
- How much state should be persisted between matches
- Whether bot players are part of the first version