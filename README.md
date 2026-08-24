# Card Game

A multiplayer card game with a custom rule system. The game combines simple color/number-based card matching with combos, stackable penalties, player interaction, and a risk/reward mechanic.

## 🎯 Objective

The objective of the game is to be the **first player to get rid of all cards in their hand**.

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
| 🌪️ Storm       |      4 | Every player draws 1 card.                           |
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

When a Storm card is played, **every player draws 1 card**, including the player who played the Storm.

The Storm card can be played on any card.

---

## 🔄 Swap

The player who plays the Swap card chooses another player.

Both players:

1. Choose one card from their own hand.
2. Exchange the selected cards simultaneously.

Players cannot see which card the other player selected before the exchange.

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

After the turn is resolved, play passes to the next player.

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
2. All other discarded cards are collected.
3. The collected cards are shuffled.
4. They become the new draw pile.

This allows the deck to continuously recycle throughout the game.

---

# 🏆 Winning

When a player's hand reaches **0 cards**, that player immediately wins the game.

The game ends as soon as a player has no cards remaining.

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
