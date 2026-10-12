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
- `docs/01-game-analysis-and-design.md`: game analysis, state flow, and test plan
- `docs/02-server-state-machine-and-socketio.md`: server state and Socket.IO architecture
- `docs/03-data-model-and-intelligent-player.md`: data model and intelligent-player plan
- `docs/04-tech-stack-react-express-postgres-socketio.md`: technology architecture

When behavior changes, update the relevant documentation so the README and technical documents remain consistent.

## Match and player rules

- A match supports 2–8 players.
- Each player starts with 7 cards.
- The base deck contains 104 cards.
- A player wins when their hand is empty after the complete resolution of their turn.
- The match continues after the first winner until only one active player remains.
- A finished player may remain as a spectator or leave.
- Finished players do not receive turns and cannot be selected as Swap or Spy targets.
- The winner and the finishing order are shown in the final results.

## Drawing and hand-limit rules

- A player's hand may never exceed 20 cards.
- The 20-card limit has priority over every card effect.
- The limit applies to normal draws, Take a Chance, +2, Storm, and all other card-drawing effects.
- Cards that do not fit because of the hand limit remain in the draw pile.
- A +2 penalty is completed after the affected player draws the cards that fit up to the 20-card limit.
- Storm rolls one shared requested value from 1–3 for each Storm card.
- Every active player is affected by the same requested Storm value, but the actual draw is capped individually by the hand limit.
- Example: with Storm 3, a player holding 10 cards draws 3, a player holding 19 draws 1, and a player holding 20 draws 0.

## Draw-pile recycling

- When the draw pile is empty, keep the top discard card in play.
- The other discard cards become reusable.
- If more than 25 reusable discard cards are available, shuffle them into a new draw pile.
- If 25 or fewer reusable discard cards are available, add a new 104-card deck before shuffling the reusable cards into the draw pile.
- Player hands are never used to refill the draw pile.

## Card rules

- A number card is playable when its color or number matches the top discard card.
- A number combo may contain multiple number cards with the same number.
- +2 cards stack.
- Storm can be played on any card and affects active players only.
- Swap targets another active player and exchanges one selected card from each hand.
- If either Swap participant has no card after the Swap card leaves the acting player's hand, the exchange is skipped.
- Color Change selects the active color for the next active player.
- Spy reveals one active player's entire hand only to the player who played Spy.
- Spy does not take or exchange cards, and the Spy player's turn ends after the effect is resolved.
- Take a Chance is available only when the player has at least one legal card and no active +2 penalty.
- Take a Chance draws one card; if it is playable, the player may play it, otherwise they keep it and their turn ends.

## Turn and state rules

- The server is authoritative for all match state and player actions.
- Keep match state separate from individual player status.
- Player statuses include `active`, `finished`, `spectating`, and `disconnected`.
- Resolve a played card or combo and all resulting effects before checking the empty-hand win condition.
- Skip finished, spectating, and disconnected players when selecting turns or card targets.
- End the match only when one active player remains.
- Do not create another turn after the match ends.
- Preserve hidden information: private hands and Spy results must only be sent to authorized players.

## Engineering expectations

- Validate the 2–8 player limit on the server.
- Validate every client action against the authoritative state.
- Use typed payloads and explicit state validation.
- Prevent duplicate and out-of-order actions from changing the match state.
- Keep card effects atomic and deterministic once their random values are selected.
- For Storm, select the shared 1–3 requested value exactly once per card effect.
- Never broadcast private hand information to unauthorized clients.
- Prefer existing project patterns and helpers over duplicated logic.
- Add or update tests for rule changes and edge cases.
