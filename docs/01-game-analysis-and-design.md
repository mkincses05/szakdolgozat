# Game Analysis, Rule Specification, State Flow, Page Flow, and Test Plan

This document is the technical source of truth for the game rules. The README describes the same rules for players; `docs/02` and `docs/03` reference the rule IDs defined here instead of restating them.

## 1. Similar Games Comparison

Wildhand belongs to the family of shedding card games: players try to empty their hand by matching the top card of a discard pile. The closest reference points are:

| Game | Deck | Matching rule | Penalty and interaction mechanics | Match end |
| --- | --- | --- | --- | --- |
| UNO | Dedicated deck with colored number and action cards | Color, number, or symbol | Draw Two, Wild Draw Four, Skip, Reverse; wild color choice | The first player to empty their hand wins the round |
| Crazy Eights | Standard 52-card deck | Suit or rank | Eights are wild and change the suit | The first player to empty their hand wins |
| Mau-Mau / Makaó | 32-card deck | Suit or rank | Specific ranks force draws, skip players, or change the suit; many variants let draw penalties be passed on | The first player to empty their hand wins |
| Exploding Kittens | Dedicated action deck (not a shedding game) | — | Peeking at hidden cards, taking cards from other players | Last surviving player wins |

Compared with these games, Wildhand combines:

- **Number combos**: several number cards with the same number in one turn.
- **Stackable +2 penalties** across consecutive turns.
- **A global effect (Storm)** with one shared random value for every other active player.
- **Hidden-information interaction** (Swap with a blind pick from the target's hand, Spy with a private reveal), similar to the peek and steal effects of Exploding Kittens.
- **Voluntary draws**, so holding back a card is a real decision.
- **A 20-card hand limit** that caps every draw effect.
- **Full finishing order**: the match continues after the winner until only one active player remains.

## 2. Rule Specification

### Setup

- **R1 – Player count**: a match supports 2–8 players. The server validates the limit.
- **R2 – Deck**: the base deck contains 104 cards: 80 number cards (4 colors × numbers 0–9 × 2 copies), 8 +2 (2 per color), 4 Swap (1 per color), 4 Storm, 4 Color Change, and 4 Spy. +2 and Swap are **colored special cards**. Storm, Color Change, and Spy are **wild cards** with no color. Special cards have no number.
- **R3 – Dealing**: each player receives 7 cards. The starting card is a random number card; a special card drawn as the starting card is returned to the draw pile at a random position and another card is drawn. A random player takes the first turn, and play continues clockwise in seat order.

### Legal plays

- **R4 – Colored top card** (number card, +2, or Swap): a card is playable if it has the same color, or it is a number card with the same number as a number top card, or it is the same kind of special card (+2 on +2, Swap on Swap), or it is a wild card.
- **R5 – Storm or Spy top card**: any card is playable.
- **R6 – Color Change top card**: a colored card of the chosen color (number card, +2, or Swap) or any wild card is playable. The chosen color stays active until a card is played on the Color Change, even if players draw, pass, or are skipped in between.
- **R7 – Active +2 penalty**: only a +2 of any color is playable. Otherwise the player must draw the penalty.
- **R8 – Combo**: a combo contains only number cards with the same number. The first card must be playable under R4–R6; the other cards may be any color. The last card becomes the top card.
- **R9 – Special cards**: wild cards are playable on any card except under R7; colored special cards follow R4–R7. At most one special card is played per turn, and special cards cannot form combos. Swap and Spy are playable only when at least one valid target exists (R12, R14).

### Special card effects

- **R10 – +2**: the penalty accumulates by 2 for each +2 played on consecutive turns. The affected player either plays a +2 or draws the accumulated penalty, capped by R16. Drawing the penalty completes it and ends that player's turn, even if 0 cards fit. The +2 stays on top as a colored card, so the next active player follows R4. If the affected player is disconnected when their turn comes, the server draws the penalty for them. If the affected player forfeits, the penalty is discarded.
- **R11 – Storm**: the server selects one integer from 1–3 exactly once per Storm play. Every active player except the Storm player, including disconnected players who have not forfeited, is requested to draw that amount, capped individually by R16. The Storm player does not draw. Draws are dealt one player at a time, starting with the next active player in seat order after the Storm player and continuing clockwise.
- **R12 – Swap**: as part of the play, the acting player selects another active, connected player, one card from their own hand, and one face-down card from the target's hand. The target's cards are shown to the acting player only as face-down positions. At resolution time, the server maps the chosen position to a card through a fresh random permutation, so the selection is blind even if the acting player has seen that hand with Spy. The two cards are exchanged immediately; the target has no choice and no response step. If the acting player has no card left after the Swap card leaves their hand, the exchange is skipped. Active targets always hold at least one card, because cards only leave a hand during its owner's turn.
- **R13 – Color Change**: the acting player selects one of the four colors as part of the play. That color is active for the next active player (R6).
- **R14 – Spy**: the acting player selects another active, connected player. A snapshot of that player's hand is sent only to the acting player. No cards move, and the acting player's turn ends.

### Drawing and the hand limit

- **R15 – Draw**: when no +2 penalty is active, a player may always draw one card instead of playing, even if they hold a legal card, and must draw if they have no legal card. Drawing ends the turn, and the drawn card cannot be played in the same turn.
- **R16 – Hand limit**: a hand never exceeds 20 cards. The limit has priority over every effect. Cards that do not fit remain in the draw pile.
- **R17 – Pass**: a player with 20 cards cannot draw voluntarily. If they have no legal card, they pass without drawing.
- **R18 – Blocked game**: if every active player, including disconnected ones, holds 20 cards and none of them has a legal card, the game is blocked and the match ends. All remaining active players share the next position. The server checks this condition after every resolved turn.
- **R19 – Draw-pile recycling**: whenever the draw pile is empty before an individual draw, including in the middle of an effect, the top discard card stays in play and the other discard cards become reusable. If more than 25 reusable cards are available, they are shuffled into a new draw pile. If 25 or fewer are available, a new 104-card deck is added first. Player hands are never used to refill the draw pile, so the draw pile can always provide a card.

### Finishing and match end

- **R20 – Finish check**: after the played card or combo and all of its effects are resolved, a player with an empty hand finishes. The first player to finish is the winner; later players take the next positions.
- **R21 – Match end**: the match ends when only one active player remains (that player takes the last non-forfeited position) or when the game is blocked (R18). If the match ends while a +2 penalty is pending, the penalty is discarded. If every other player forfeits before anyone finishes, the remaining player is the winner. No turn is created after the match ends.

### Time limits, connection, and room rules

- **R22 – Turn timer**: every turn has a time limit. On timeout, the server draws the pending +2 penalty for the player, or otherwise draws one card (or passes if they hold 20 cards), even if the player holds a legal card.
- **R23 – Disconnect and forfeit**: a disconnected player keeps their seat and status during a grace period, but their turns are skipped (except under R10) and they cannot be selected as Swap or Spy targets. A player who disconnects during their own turn keeps that turn until the turn timer expires. If no active player is connected, the match waits until a player reconnects or the grace periods expire. A player who does not reconnect within the grace period, or who leaves an unfinished match, forfeits: their hand is removed from play, and they are ranked below every non-forfeited player. Players who forfeit later rank above players who forfeited earlier. A forfeit can trigger R21.
- **R24 – Host**: the host starts the match. If the host leaves the room, in the lobby or during a match, the member who has been in the room the longest becomes the host.
- **R25 – Hidden information**: each player receives only their own hand. Other players' hands are visible only as hand sizes. Spy snapshots go only to the Spy player. Spectators receive the public state only and never see private hands.

## 3. State Flow Overview

The detailed state machine is defined in `docs/02-server-state-machine-and-socketio.md`. In summary:

- **Room**: `lobby` → `in_match` → `lobby` (after the match, for a new match); the room moves to `closed` from any state when the last member leaves.
- **Match**: `dealing` → `awaiting_action` → `ended`.
- An active +2 penalty is stored as `pendingPenalty` on the match, not as a separate phase.
- **Player**: match status `active` → `finished` or `forfeited`; connection presence `connected`, `disconnected`, or `left`. A finished player who stays connected is a spectator.

## 4. Page Flow

- **Landing page**: language selection, display name, create or join a room.
- **Lobby page**: room members, host controls, and the start button for the host.
- **Gameplay page**: the player's hand, the discard pile, other players' hand sizes, turn and timer indicators, and Swap, Spy, and Color Change dialogs. Finished players stay on this page in spectator mode with the public state only.
- **Results page**: the winner, the finishing order, and forfeits.

Most of the game happens on the gameplay page. Navigation between pages is kept minimal.

## 5. Test Plan

Each test refers to the rule it verifies.

### Engine acceptance tests

- R3: dealing gives 7 cards to each player; a special starting card is replaced by a number card.
- R2: the deck contains 2 +2 and 1 Swap per color, and colorless Storm, Color Change, and Spy cards.
- R4–R7: legality on colored number, colored special, Storm or Spy, Color Change, and active-penalty top cards; a +2 or Swap of a different color is playable only on the same kind of card.
- R8, R9: a valid combo is accepted; a combo with a non-playable first card, mixed numbers, or a special card is rejected.
- R10: +2 stacking across turns with any color; drawing the penalty ends the turn; the next player follows the color of the +2.
- R4, R10: after a penalty has been drawn, a +2 of any color played on the +2 starts a new penalty of 2.
- R10, R16: a +2 that reaches the 20-card limit is completed after the player draws the cards that fit.
- R11: one Storm value is selected per play and is identical for every other active player; the Storm player draws nothing; a player with 10 cards draws 3, a player with 19 cards draws 1, and a player with 20 cards draws 0 for a Storm value of 3.
- R11, R20: a last-card Storm finishes the Storm player, because they do not draw.
- R12: Swap exchanges the acting player's chosen card with a blindly picked card of the target; the chosen position is mapped through a fresh random permutation at resolution time; a last-card Swap skips the exchange and the player finishes.
- R14: the Spy snapshot is delivered only to the Spy player.
- R15: a player may draw voluntarily while holding a legal card; a player with no legal card must draw; drawing ends the turn, even if the drawn card would be playable; drawing is not allowed while a +2 penalty is active.
- R6: the Color Change color stays active after a draw, a pass, or a skipped turn.
- R9: Swap and Spy are not playable when no active, connected target exists.
- R10: a player at 20 cards completes a +2 penalty by drawing 0 cards; a disconnected player's penalty is drawn by the server; a forfeit discards the penalty.
- R17, R18: a player at 20 cards cannot draw voluntarily and passes when they have no legal card; when every active player holds 20 cards without a legal card, the match ends and they share the next position.
- R22: a timeout draws even when the player holds a legal card.
- R19: an empty draw pile with more than 25 reusable cards is reshuffled without a new deck; with 25 or fewer, a new 104-card deck is added; a reshuffle in the middle of a Storm continues the draw correctly.
- R20, R21: a finished player becomes a spectator and the match continues; the match ends when one active player remains; a pending +2 penalty is discarded when a last-card +2 ends the match.
- R23: a forfeit removes the hand from play, ranks the player correctly, and can end the match.

### Invariant tests

Run randomized simulations with a seeded random number generator and check after every action:

- The total number of cards in the draw pile, the discard pile, all hands, and removed hands equals 104 × the number of decks in play.
- No hand ever exceeds 20 cards.
- Finished and forfeited players never receive a turn and are never selected as targets.
- Every simulated match ends, and no turn is created after the match ends.
- The same seed and the same actions always produce the same match.

### Protocol tests

- Event payload validation.
- Duplicate `actionId` and stale `stateVersion` rejection.
- Rejection of actions that are not valid in the current state.
- Host-only command enforcement and host transfer (R24).
- Private hands and Spy snapshots are never sent to other players or spectators (R25).

### Integration tests

- Multiple clients in one room, including the 2–8 player limit (R1).
- Turn synchronization between clients and the server.
- Reconnect within the grace period and forfeit after it (R23).
- Turn timer (R22).
- English, Hungarian, and German interface translations.

## 6. Turn Resolution Contract

The engine, the server, and the tests must use the same order for every turn:

1. Commit the played card or combo to the discard pile.
2. Resolve every effect caused by that play.
3. Check the acting player's hand size.
4. If the hand is empty, mark the player as `finished`, record their position, and remove them from the turn order.
5. If more than one active player remains, select the next active, connected player. A disconnected active player is selected only to have a pending +2 penalty drawn for them (R10).
6. If only one active player remains, end the match (R21).

A turn without a play follows R10, R15, or R17: the player draws the penalty, draws one card, or passes, and the turn ends without a finish check, because the hand cannot become empty.
