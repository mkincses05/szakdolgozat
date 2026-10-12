# Wildhand: The Card Game

A multiplayer card game with a custom rule system. The game combines simple color/number-based card matching with combos, stackable penalties, player interaction, and a risk/reward mechanic.

## 👥 Players and Match End

Each match can be played by **2 to 8 players**.

The first player whose hand becomes empty after the complete resolution of their turn **wins**. The match does not end at that point:

* the winner can remain in the room as a spectator or leave the game;
* the remaining players continue playing;
* the match ends when only one active player remains.

The winner and the order in which the other players finish are shown in the final results.

## 🌍 Internationalization

The game will be available in:

* English (`en`)
* Hungarian (`hu`)
* German (`de`)

You can choose the language used throughout the game, including the main menu, lobby, gameplay, spectator view, and results.

## 🎯 Objective

The objective of the game is to be the **first active player to get rid of all cards in their hand**. That player wins the match, while the other active players continue until only one active player remains.

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

---

# ⭐ Special Cards

There are **24 special cards**.

| Card            | Amount | Effect                                               |
| --------------- | -----: | ---------------------------------------------------- |
| ➕ +2            |      8 | The next player must draw 2 cards.                   |
| 🌪️ Storm       |      4 | All remaining players draw the same random amount of cards (1–3). |
| 🔄 Swap         |      4 | Choose another player and exchange 1 card with them. |
| 🎨 Color Change |      4 | Choose the color that will be active next.           |
| 👁️ Spy         |      4 | Look at another player's entire hand.                |

---

## ➕ +2

The next player must draw **2 cards**.

+2 cards can be stacked.

For example:

> +2 → +2 → +2

The next player must draw **6 cards** unless they can play another +2.

When a +2 penalty is active, the only way to pass the penalty is by playing another +2.

---

## 🌪️ Storm

When a Storm card is played, a random number between **1 and 3** is chosen once. **Every player who is still in the game draws up to that many cards**, including the player who played the Storm. Players who have already won are not affected.

The same number is the maximum requested amount for everyone affected by that Storm. The general hand limit can reduce the actual amount for individual players.

The Storm card can be played on any card.

---

## 🔄 Swap

The player who plays the Swap card chooses another player.

Both players:

1. Choose one card from their own hand.
2. Exchange the selected cards simultaneously.

Players cannot see which card the other player selected before the exchange.

If either participant has no card to exchange after the Swap card has been played, the exchange is skipped. The turn still finishes normally, and the win check is performed after this skipped effect.

---

## 🎨 Color Change

The Color Change card can be played on any card.

After playing it, the player chooses one of the four colors:

* Red
* Blue
* Green
* Yellow

The chosen color becomes the active color for the next player.

---

## 👁️ Spy

The player who plays the Spy card chooses another player and may **look at their entire hand**.

The Spy only provides information. No cards are taken or exchanged as a result of using it.
Only the player who played the Spy can see the revealed hand, and their turn ends after the Spy effect is resolved.

---

# 🔥 Game Mechanics

## Combo / Chain Reaction

A player can play multiple **number cards with the same number** during a single turn.

For example:

> 🔴 7 → 🔵 7 → 🟢 7

All three cards can be played as one combo.

The final card played during the combo becomes the new top card.

### +2 Chain Reaction

+2 cards have a special chain reaction mechanic.

For example:

> +2 → +2 → +2 → +2

The next player must draw **8 cards** if they cannot continue the chain with another +2.

---

# 🎲 Risk / "Take a Chance"

During their turn, a player may choose to take a risk instead of playing a card.

The player can only use this option if they **currently have at least one card that could legally be played**.

### Risk procedure

1. The player chooses not to play a card.
2. They draw **1 card** from the draw pile.
3. They check whether the drawn card can be played.
4. If the card can be played, the player may play it.
5. If the card cannot be played, the player keeps it and their turn ends.

The Risk action **cannot be used while a +2 penalty is active**.

This mechanic creates a risk/reward decision between making a safe move and attempting to draw a potentially more useful card.

---

# 🎮 Game Flow

## Starting the Game

1. Each player receives **7 cards**.
2. A random **number card** is placed face-up as the starting card.
3. Players take turns clockwise.

The starting card is always a number card, so the game does not begin with an active special-card effect.

---

# 🔄 Player Turn

During their turn, a player can choose **one** of the following:

### 1. Play a card or combo

Play a legally playable number card or a valid combo.

### 2. Play a special card

Play a special card and resolve its effect.

### 3. Take a Risk

If the player has at least one legally playable card, they may choose the Risk action instead.

### 4. No playable card

If the player has no legally playable card, they draw **1 card** and their turn ends.
If the draw pile cannot provide a card after reshuffling, the player passes without drawing.

Every turn is resolved in this order:

1. The played card or combo is removed from the player's hand and placed on the discard pile.
2. The card's complete effect is resolved.
3. If the player's hand is empty, that player wins and may stay to watch or leave.
4. If more than one player remains in the game, play passes to the next player.
5. When only one player remains, the match ends and the finishing order is shown.

The winner check is performed only after all effects of the turn have finished. A player therefore wins only if their hand is still empty after the complete resolution.

---

# 🃏 Special Card Rules

Special cards can generally be **played on any card**.

After a special card is played, the next player may play any legally valid card according to the special card's effect.

### Color Change exception

After a Color Change card is played, the chosen color becomes active.

The next player must follow that color or play another card that is allowed under the game's special-card rules.

### +2 exception

When a +2 penalty is active, the next player cannot use other special cards or number cards to avoid the penalty.

They must either:

* play another +2 and pass the accumulated penalty onward, or
* draw the accumulated number of cards.

---

# 🔄 Reshuffling the Draw Pile

When the draw pile becomes empty:

1. The top card of the discard pile remains in play.
2. All other discarded cards are collected as reusable cards.
3. If more than 25 reusable cards are available, they are shuffled into a new draw pile.
4. If 25 or fewer reusable cards are available, a new 104-card deck is added before the reusable cards are shuffled into the new draw pile.

## 🖐️ Hand Limit

A player's hand can contain at most **20 cards**. This limit has priority over every card effect.

The limit applies to normal draws, `Take a Chance`, `+2`, Storm, and every other card effect. A player never receives more than 20 cards. If a player has fewer than 20 cards, they draw only as many cards as fit in their hand. Any cards that do not fit remain in the draw pile.

If a `+2` effect reaches the hand limit, the player draws only the cards that fit and the penalty is completed.

---

# 🏆 Winning

A player wins when their hand contains **0 cards after the complete resolution of their turn**. The winner can remain in the game as a spectator or leave the room at any time.

The game does not end in the middle of a card effect, and it does not end immediately when the first player wins.

This ordering is important for special cards:

* A player who plays their last card as **Storm** does not win immediately, because Storm first makes every remaining player, including the Storm player, draw the same random amount of cards. The win check happens after that draw.
* A player who plays their last card as **Swap** wins if the exchange is skipped because one of the participants has no card to exchange. The win check happens after the skipped effect.

Once a player wins, the remaining players continue until only one player remains.

---

# 📊 Deck Composition

| Card Type                                       |  Amount |
| ----------------------------------------------- | ------: |
| Number Cards (4 colors × 10 numbers × 2 copies) |      80 |
| +2                                              |       8 |
| Storm                                           |       4 |
| Swap                                            |       4 |
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
* **Risk/reward decision-making**

The goal is to create a multiplayer card game that is **easy to learn but provides meaningful strategic decisions, player interaction, and unpredictable situations**.
