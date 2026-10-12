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

### Player count and match objective

- A match supports **2–8 players**.
- The first active player whose hand becomes empty after complete turn resolution wins.
- The winner is removed from the active turn order and may remain in the room as a spectator or leave.
- The remaining active players continue until only one active player remains.
- The match result records the winner and the subsequent finishing order.
- A Storm randomly selects one value from 1 to 3 for the current effect.
- Every active player affected by that Storm receives the same selected value as the requested amount, but the 20-card hand limit may reduce the actual amount for individual players.
- A player's hand may contain at most 20 cards, and this limit has priority over every card effect.
- If a Storm would exceed the hand limit, each player draws only as many cards as fit in their own hand.
- If the draw pile is empty and 25 or fewer reusable discard-pile cards are available, a new 104-card deck is added before the reusable cards are shuffled.

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
   - A player with an empty hand is marked as finished and wins
   - The next active player is selected while more than one active player remains

6. **Game End**
   - Only one active player remains
   - The final result and finishing order are broadcast

Finished players stay in the room as spectators unless they choose to leave. They cannot take turns, receive turn-specific actions, or be selected as targets. Global effects such as Storm affect active players only.

The Spy only reveals the selected active player's hand to the player who played the Spy. It does not take or exchange cards, and the Spy player's turn ends after the effect is resolved.

## 3. Page Flow

A simple page flow is enough for the current scope:

- **Landing page**
- **Room / lobby page**
- **Game setup / waiting page**
- **Gameplay page**
- **Result page**

Most of the game should happen inside the gameplay page, while navigation between pages should be kept minimal.

## 5. Test Plan

### Functional tests
- Room creation and joining
- Game start and dealing
- Legal card play validation
- Combo resolution
- Special card effects
- Risk action restrictions
- Win condition handling
- Player elimination, spectator mode, and leaving after winning
- Enforcement of the 2–8 player room limit
- English, Hungarian, and German interface translations

The following cases are mandatory acceptance tests for the engine and server:

- A player with no legal card draws one card and the turn ends.
- A player with no legal card passes when the draw pile and reshuffle cannot provide a card.
- A last-card Storm resolves its draw effect before the finish check, so the Storm player does not win from that play.
- A Storm rolls its 1–3 requested amount once, and every active player is affected by that same requested amount; the actual draw may be lower for players near the 20-card hand limit.
- The 20-card hand limit is enforced for normal draws, Take a Chance, +2, Storm, and every other card effect.
- A Storm gives each active player up to its shared value, reduced individually only when the 20-card hand limit leaves less room.
- When the draw pile is empty, 25 or fewer reusable discard cards trigger the addition of a new 104-card deck.
- A last-card Swap skips the exchange when either participant has no card to exchange, then the empty hand is checked for victory.
- A player who is empty after all effects is moved to `finished`, wins, and becomes a spectator; the match continues.
- The next turn skips finished players and the match ends only when one active player remains.

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
- A last-card Storm applies its shared 1–3 card draw before the finish check, so it does not automatically win
- The Storm requested amount is selected once from 1–3 and is identical for every active player, while the actual amount may differ because of the hand limit
- A player with 19 cards receives only 1 card from any effect that would give more cards
- A player with 20 cards receives no additional cards
- A +2 that reaches the 20-card limit is completed after the player draws the cards that fit
- A last-card Swap skips the exchange if either participant has no card, then performs the win check
- Finished players cannot be targeted by Swap or Spy and do not draw from Storm
- Player disconnect during turn
- Simultaneous actions during state transitions
- Player elimination triggered during a chained action
- Match end when only one active player remains

### Turn resolution contract

The engine, server and tests must use the same order for every turn:

1. Commit the played card or combo to the discard pile.
2. Resolve every effect caused by that play.
3. Check the active player's hand size.
4. If the hand is empty, mark the player as finished, record the win, and remove them from the active turn order.
5. If more than one active player remains, select the next active player.
6. If only one active player remains, transition to `Game End`.

For a normal turn with no legally playable card, the player draws one card and the turn ends. If reshuffling cannot produce a card, the player passes without drawing. A Swap effect is conditional: if either participant has no card after the Swap card has left the active player's hand, no exchange occurs.
