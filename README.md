# Wildhand: The Card Game

A multiplayer card game with a custom rule system. The game combines simple color/number-based card matching with combos, stackable penalties, and player interaction.

## 👥 Players and Match End

Each match can be played by **2 to 8 players**.

The first player whose hand becomes empty after the complete resolution of their turn is the **winner**. The match does not end at that point:

* the winner can remain in the room as a spectator or leave the game;
* the remaining players continue playing, and each player who empties their hand later finishes in the next position;
* the match ends when only one active player remains.

The winner and the order in which the other players finish are shown in the final results.

## 🌍 Internationalization

The game will be available in:

* English (`en`)
* Hungarian (`hu`)
* German (`de`)

You can choose the language used throughout the game, including the main menu, lobby, gameplay, spectator view, and results.

## 🎯 Objective

The objective of the game is to be the **first active player to get rid of all cards in their hand**. That player wins the match, while the other active players continue playing for the remaining positions until only one active player remains.

---

# 🃏 Cards

The deck contains **104 cards** in total.

## Number Cards

There are **4 colors**:

* 🔴 Red
* 🔵 Blue
* 🟢 Green
* 🟡 Yellow

Each color contains the numbers **0–9**.

There are **2 copies of each number in each color**.

**Total: 80 number cards**

### Playing Number Cards

A number card can be played if **either its color or its number matches** the top card of the discard pile.

For example, if the top card is:

> 🔴 7

The following cards can be played:

* 🔴 3 — matching color
* 🔵 7 — matching number

However:

* 🔵 3 — cannot be played

Different rules apply when the top card is a special card. See [Special Card Rules](#-special-card-rules).

---

# ⭐ Special Cards

There are **24 special cards**. Special cards have no number.

| Card            | Amount | Color                  | Effect                                               |
| --------------- | -----: | ---------------------- | ---------------------------------------------------- |
| ➕ +2            |      8 | Colored (2 per color)  | The next player must draw 2 cards.                   |
| 🔄 Swap         |      4 | Colored (1 per color)  | Give 1 card to another player and take 1 of theirs blindly. |
| 🌪️ Storm       |      4 | Wild (no color)        | Every other player draws the same random amount of cards (1–3). |
| 🎨 Color Change |      4 | Wild (no color)        | Choose the color that will be active next.           |
| 👁️ Spy         |      4 | Wild (no color)        | Look at another player's entire hand.                |

**Colored special cards** (+2 and Swap) follow the color rules like number cards. **Wild cards** (Storm, Color Change, and Spy) can be played on any card, except while a +2 penalty is active.

Swap and Spy can only target players who are still in the game and connected. If there is no such player, Swap and Spy cannot be played.

---

## ➕ +2

The next player must draw **2 cards**.

+2 cards can be stacked across consecutive turns: each player may continue the chain by playing one +2 of their own.

For example:

> Player A: +2 → Player B: +2 → Player C: +2

Player D must draw **6 cards** unless they can play another +2.

When a +2 penalty is active, the only way to pass the penalty is by playing another +2.

A +2 can be played on a card of the same color (including a color chosen with Color Change), on another +2 of any color, or on a Storm or Spy.

A player who draws the penalty cards ends their turn. The +2 stays on top, so the following player must match its color, play a +2, or play a wild card.

If a player plays their last card as a +2 and only one other player is still in the game, the match ends immediately and the penalty is not drawn.

---

## 🌪️ Storm

When a Storm card is played, a random number between **1 and 3** is chosen once. **Every other player who is still in the game draws up to that many cards.** The player who played the Storm does not draw, and players who have already finished are not affected.

The same number is the maximum requested amount for everyone affected by that Storm. The general hand limit can reduce the actual amount for individual players.

The Storm card can be played on any card, except while a +2 penalty is active.

---

## 🔄 Swap

Swap is a colored card: it can be played on a card of the same color (including a color chosen with Color Change), on another Swap of any color, or on a Storm or Spy.

The player who plays the Swap card:

1. Chooses another player who is still in the game.
2. Chooses one card from their own hand to give away.
3. Picks one card from the other player's hand **blindly**: the cards are shown face down in a shuffled order.

The two cards are exchanged immediately. The other player does not choose anything.

If the Swap was the last card of the player who played it, there is nothing to exchange and the exchange is skipped. The turn still finishes normally, and the finish check is performed after this skipped effect.

---

## 🎨 Color Change

The Color Change card is a wild card: it can be played on any card, except while a +2 penalty is active.

After playing it, the player chooses one of the four colors:

* Red
* Blue
* Green
* Yellow

The chosen color becomes the active color for the next player. It stays active until someone plays a card on the Color Change.

---

## 👁️ Spy

The player who plays the Spy card chooses another player who is still in the game and may **look at their entire hand** as it is at that moment.

The Spy only provides information. No cards are taken or exchanged as a result of using it.
Only the player who played the Spy can see the revealed hand, and their turn ends after the Spy effect is resolved.

---

# 🔥 Game Mechanics

## Combo / Chain Reaction

A player can play multiple **number cards with the same number** during a single turn.

The first card of the combo must be playable on the current top card. The other cards must have the same number and can be any color.

For example, if the top card is 🔴 3:

> 🔴 7 → 🔵 7 → 🟢 7

All three cards can be played as one combo, because the 🔴 7 matches the red color.

The final card played during the combo becomes the new top card.

Only number cards can form a combo. Special cards are always played one per turn.

---

# 🎮 Game Flow

## Starting the Game

1. Each player receives **7 cards**.
2. A random **number card** is placed face-up as the starting card.
3. A random player takes the first turn, and play continues clockwise.

The starting card is always a number card, so the game does not begin with an active special-card effect.

---

# 🔄 Player Turn

During their turn, a player chooses **one** of the following:

### 1. Play a card or combo

Play a legally playable number card or a valid combo.

### 2. Play a special card

Play a legally playable special card and resolve its effect.

### 3. Draw a card

Draw **1 card** and end the turn. A player may draw even if they have a playable card, for example to keep a +2 for later. A player who has no playable card must draw.

The drawn card cannot be played in the same turn, even if it would match. Drawing is not possible while a +2 penalty is active: the player must play a +2 or draw the penalty instead.

If the player already holds 20 cards, they cannot draw. If they also have no playable card, they pass.

Every turn is resolved in this order:

1. The played card or combo is removed from the player's hand and placed on the discard pile.
2. The card's complete effect is resolved.
3. If the player's hand is empty, that player finishes: the first player to finish is the winner. A finished player may stay to watch or leave.
4. If more than one player remains in the game, play passes to the next player.
5. When only one player remains, the match ends and the finishing order is shown.

The finish check is performed only after all effects of the turn have finished. A player therefore finishes only if their hand is still empty after the complete resolution.

## ⏱️ Time Limits and Leaving

Each turn has a time limit. If it runs out, the game acts for the player: they draw the active +2 penalty, or otherwise draw 1 card (or pass if they already hold 20 cards), even if they had a playable card.

If a player loses their connection, they have a short time to reconnect. Their turns are skipped until they return, except that a +2 penalty aimed at them is still drawn for them. A player who does not return in time, or who leaves an unfinished match, **forfeits**: their cards are removed from the game and they are ranked below every player who finished or was still playing.

If the room host leaves, the player who has been in the room the longest becomes the new host.

---

# 🃏 Special Card Rules

**Wild cards** (Storm, Color Change, and Spy) can be **played on any card**. While a +2 penalty is active, only another +2 can be played.

**Colored special cards** (+2 and Swap) can be played on a card of the same color or on the same kind of card in any color (+2 on +2, Swap on Swap).

When a colored special card is on top, the next player must match its color, play the same kind of card, or play a wild card.

After a Storm or Spy, the next player may play **any card**.

### Color Change exception

After a Color Change card is played, the chosen color becomes active.

The next player must play a card of the chosen color (a number card, +2, or Swap) or a wild card.

### +2 exception

When a +2 penalty is active, the next player cannot use other special cards or number cards to avoid the penalty.

They must either:

* play another +2 and pass the accumulated penalty onward, or
* draw the accumulated number of cards, which ends their turn.

---

# 🔄 Reshuffling the Draw Pile

When the draw pile becomes empty, even in the middle of a card effect:

1. The top card of the discard pile remains in play.
2. All other discarded cards are collected as reusable cards.
3. If more than 25 reusable cards are available, they are shuffled into a new draw pile.
4. If 25 or fewer reusable cards are available, a new 104-card deck is added before the reusable cards are shuffled into the new draw pile.

Because a new deck is added when needed, the draw pile can always provide a card.

## 🖐️ Hand Limit

A player's hand can contain at most **20 cards**. This limit has priority over every card effect.

The limit applies to normal draws, `+2`, Storm, and every other card effect. A player never receives more than 20 cards. If a player has fewer than 20 cards, they draw only as many cards as fit in their hand. Any cards that do not fit remain in the draw pile.

If a `+2` effect reaches the hand limit, the player draws only the cards that fit and the penalty is completed.

### Blocked game

If every player who is still in the game holds 20 cards and none of them can play, the game is blocked and the match ends. The remaining players share the next position.

---

# 🏆 Winning

A player finishes when their hand contains **0 cards after the complete resolution of their turn**. The first player to finish is the winner. A finished player can remain in the game as a spectator or leave the room at any time.

The game does not end in the middle of a card effect, and it does not end immediately when the first player finishes.

This ordering is important for special cards:

* A player who plays their last card as **Storm** finishes, because the Storm player does not draw. The other players draw first, then the finish check happens.
* A player who plays their last card as **Swap** finishes, because they have no card left to exchange and the exchange is skipped. The finish check happens after the skipped effect.

Once a player finishes, the remaining players continue until only one player remains. That player takes the last position among the players who did not forfeit.

If every other player forfeits before anyone finishes, the last remaining player is the winner.

---

# 📊 Deck Composition

| Card Type                                       |  Amount |
| ----------------------------------------------- | ------: |
| Number Cards (4 colors × 10 numbers × 2 copies) |      80 |
| +2 (4 colors × 2 copies)                        |       8 |
| Swap (4 colors × 1 copy)                        |       4 |
| Storm                                           |       4 |
| Color Change                                    |       4 |
| Spy                                             |       4 |
| **Total**                                       | **104** |

---

# 💡 Core Game Features

The main mechanics of the game are:

* **Color and number matching**
* **Number combos**
* **Stackable +2 chain reactions**
* **Player-to-player card swapping**
* **Hidden-information gameplay through Spy**
* **Global effects through Storm**
* **Color changes**
* **Voluntary draws to save cards for later**

The goal is to create a multiplayer card game that is **easy to learn but provides meaningful strategic decisions, player interaction, and unpredictable situations**.
