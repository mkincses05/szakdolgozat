# Wildhand project context for Claude

## Git conventions

- Branch names must use `feature/` or `hotfix/`.
- After the prefix, use a short branch name with words separated by hyphens.
- Branch names may contain only lowercase, unaccented ASCII letters, numbers, and hyphens.
- Commit messages must use `feat: short description` or `fix: short description`.
- Commit descriptions use spaces between words and should be short and clear.

Examples:

- `feature/add-game-room`
- `hotfix/fix-card-limit`
- `feat: add game room`
- `fix: enforce card limit`

## Internationalization

The user interface supports:

- English (`en`)
- Hungarian (`hu`)
- German (`de`)

Use an i18n solution for all user-facing text. It is forbidden to hardcode plain translatable text directly in UI components, pages, validation messages, notifications, or error messages. Add new text to the appropriate translation resources and reference it through i18n keys.

Translations cover the landing page, lobby, gameplay, spectator view, results, validation messages, status indicators, and connection messages.

## Project facts

Wildhand is a multiplayer card game with custom rules.

The project uses:

- React and TypeScript for the frontend
- Node.js and Express for the backend
- Socket.IO for real-time communication
- PostgreSQL for persistent data

The README is written for players. Technical and implementation details belong in `docs/`.

## Authoritative documentation

Read the relevant documentation before changing game rules or architecture:

- `README.md`: player-facing rules and features
- `docs/01-game-analysis-and-design.md`: game analysis, technical rule specification, state flow, page flow, and test plan
- `docs/02-server-state-machine-and-socketio.md`: server state, Socket.IO events, timers, and visibility rules
- `docs/03-data-model-and-intelligent-player.md`: runtime and persistent data model, intelligent-player plan
- `docs/04-tech-stack-react-express-postgres-socketio.md`: technology architecture

The numbered rules in `docs/01-game-analysis-and-design.md` are the technical source of truth for game rules. When behavior changes, update the relevant documentation so the README and technical documents remain consistent.

## Match and player rules

- A match supports 2–8 players.
- Each player starts with 7 cards.
- The base deck contains 104 cards: 80 number cards, 8 +2 (2 per color), 4 Swap (1 per color), 4 Storm, 4 Color Change, and 4 Spy.
- +2 and Swap are colored special cards; Storm, Color Change, and Spy are colorless wild cards.
- The starting card is a random number card; a special card drawn as the starting card is returned to the draw pile and another card is drawn.
- A random player takes the first turn; play continues clockwise in seat order.
- A player finishes when their hand is empty after the complete resolution of their turn. The first player to finish is the winner.
- The match continues after the first winner until only one active player remains.
- A finished player may remain as a spectator or leave.
- Finished and forfeited players do not receive turns and cannot be selected as Swap or Spy targets.
- A player who leaves an unfinished match, or does not reconnect within the grace period, forfeits: their hand is removed from play and they are ranked below all non-forfeited players.
- If the match ends while a +2 penalty is pending, the penalty is discarded.
- The winner and the finishing order are shown in the final results.

## Drawing and hand-limit rules

- A player's hand may never exceed 20 cards.
- The 20-card limit has priority over every card effect.
- The limit applies to normal draws, +2, Storm, and all other card-drawing effects.
- Cards that do not fit because of the hand limit remain in the draw pile.
- A +2 penalty is completed after the affected player draws the cards that fit up to the 20-card limit.
- Drawing a +2 penalty ends the affected player's turn; the +2 stays on top as a colored card for the next active player.
- Storm rolls one shared requested value from 1–3 for each Storm play.
- Every active player except the Storm player is affected by the same requested Storm value, but the actual draw is capped individually by the hand limit. The Storm player does not draw.
- Storm draws are dealt one player at a time, starting with the next active player in seat order after the Storm player and continuing clockwise.
- Example: with Storm 3, a player holding 10 cards draws 3, a player holding 19 draws 1, and a player holding 20 draws 0.
- When no +2 penalty is active, a player may draw one card instead of playing, even with a legal card, and must draw if they have no legal card. Drawing ends the turn; the drawn card cannot be played in the same turn.
- A player with 20 cards cannot draw voluntarily; with no legal card they pass without drawing.
- If every active player holds 20 cards and none has a legal card, the game is blocked: the match ends and the remaining active players share the next position.
- A player at 20 cards facing a +2 penalty draws 0 cards; the penalty is completed and their turn ends.
- If the player facing a +2 penalty is disconnected, the server draws the penalty for them; if they forfeit, the penalty is discarded.

## Draw-pile recycling

- When the draw pile is empty, keep the top discard card in play. This can happen before any individual draw, including in the middle of an effect.
- The other discard cards become reusable.
- If more than 25 reusable discard cards are available, shuffle them into a new draw pile.
- If 25 or fewer reusable discard cards are available, add a new 104-card deck before shuffling the reusable cards into the draw pile.
- Player hands are never used to refill the draw pile.

## Card rules

- On a colored top card (number, +2, or Swap), a card is playable if it has the same color, the same number (number on number), the same kind (+2 on +2, Swap on Swap), or it is a wild card.
- On a Storm or Spy top card, any card is playable.
- After Color Change, the next player must play a colored card of the chosen color or a wild card; the color stays active until a card is played on the Color Change.
- While a +2 penalty is active, only another +2 of any color may be played; otherwise the player draws the penalty.
- A number combo contains number cards with the same number; the first card must be playable, the others may be any color.
- Special cards cannot form combos; at most one special card is played per turn.
- Swap and Spy are legal only when at least one active, connected target exists.
- +2 cards stack across consecutive turns.
- Storm can be played on any card except during a +2 penalty and affects every other active player.
- Swap: the acting player selects an active, connected target, one card from their own hand, and one face-down card from the target's hand; the cards are exchanged immediately and the target does not respond.
- The target's hand is shown to the acting player only as face-down positions; at resolution time the chosen position is mapped to a card through a fresh random permutation, so the pick is blind.
- If the acting player has no card left after the Swap card leaves their hand, the exchange is skipped.
- Spy reveals a snapshot of one active, connected player's entire hand only to the player who played Spy.
- Spy does not take or exchange cards, and the Spy player's turn ends after the effect is resolved.

## Turn and state rules

- The server is authoritative for all match state and player actions.
- Keep room state, match state, and individual player status separate.
- Player match status is `active`, `finished`, or `forfeited`; connection presence is `connected`, `disconnected`, or `left`. A finished player who stays connected is a spectator.
- Resolve a played card or combo and all resulting effects before checking the empty-hand finish condition.
- Skip finished, forfeited, and disconnected players when selecting turns or card targets; a disconnected player is selected only to have a pending +2 penalty drawn for them.
- Every turn has a time limit. On timeout, the server draws the pending +2 penalty for the player, or otherwise draws one card (or passes at 20 cards), even if the player holds a legal card.
- A player who disconnects during their own turn keeps that turn until the turn timer expires.
- If the host leaves the room, in the lobby or during a match, the longest-present member becomes the host.
- End the match only when one active player remains or the game is blocked.
- Do not create another turn after the match ends.
- Preserve hidden information: private hands and Spy results must only be sent to authorized players. Spectators never see private hands.

## Engineering expectations

- Validate the 2–8 player limit on the server.
- Validate every client action against the authoritative state.
- Use typed payloads and explicit state validation.
- Prevent duplicate and out-of-order actions from changing the match state.
- Keep card effects atomic and deterministic once their random values are selected.
- Use an injectable, seedable random number generator for shuffles, Storm values, and the Swap position permutation.
- For Storm, select the shared 1–3 requested value exactly once per card effect.
- Never broadcast private hand information to unauthorized clients.
- Prefer existing project patterns and helpers over duplicated logic.
- Add or update tests for rule changes and edge cases.
