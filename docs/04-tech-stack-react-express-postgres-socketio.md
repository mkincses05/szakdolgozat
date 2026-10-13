# Tech Stack Overview

This project uses a TypeScript-based full-stack setup: a React frontend, a Node.js and Express backend, PostgreSQL for persistent data, and Socket.IO for real-time communication.

## Repository Structure

- `backend/`: Express and Socket.IO server, game engine, persistence.
- `frontend/` (planned): React application.
- `shared/`: the `@wildhand/shared` ES module package used by both the backend and the frontend: card types, the 104-card deck definition, rule constants, error codes, client views, Socket.IO event names, typed event maps, and zod payload schemas. Build it with `npm run build` in `shared/` before the backend or frontend uses it.
- `docs/`: technical documentation.

The game engine is a pure TypeScript module without Socket.IO or database dependencies, so it can be tested directly and reused by the headless bot simulator (`docs/03`).

## React + TypeScript

React is used for building the user interface, while TypeScript adds static typing and better developer tooling.

This combination is useful because:

- components can be split into reusable UI parts
- props and state can be typed more safely
- bugs caused by invalid data shapes are easier to catch early
- the codebase stays easier to maintain as the project grows

In this project, React is used for:

- the landing page with language selection
- the lobby
- the gameplay interface, including the player's hand, action controls, turn timer, and Swap, Spy, and Color Change dialogs
- the spectator view for players who have finished
- the results view

Planned tooling: Vite as the build tool and development server.

### Internationalization

The frontend supports English, Hungarian, and German with react-i18next (planned). Translations cover all user-facing labels, validation messages, error codes returned by the server, status indicators, connection messages, spectator controls, and result screens. The server sends stable error codes, never translated text.

## Express

Express (version 5) is the backend web framework. It handles HTTP requests, routes, middleware, and server-side application logic.

In this project, Express is used for:

- creating rooms and issuing guest identities with reconnect tokens
- serving match history and statistics
- health checks
- hosting the Socket.IO server on the same HTTP server

## PostgreSQL

PostgreSQL is the relational database used for persistent storage. The schema is described in `docs/03-data-model-and-intelligent-player.md`.

It stores:

- guest users
- rooms
- matches and their players
- the action log of every match
- finishing order, forfeits, and statistics

The live match state is kept in server memory; PostgreSQL stores the action log and the final results.

## Socket.IO

Socket.IO (version 4) is used for real-time communication between the client and the server. The event catalog is defined in `docs/02-server-state-machine-and-socketio.md`.

It is used for:

- room synchronization and host changes
- player actions with acknowledgements
- personal game-state views, so private hands reach only their owner
- turn changes and timer deadlines
- penalty updates
- Storm effect updates, including the shared random value and each opponent's actual draw amount after the hand limit
- draw-pile reshuffle updates, including the addition of a new deck
- private Spy reveals and Swap results
- reconnect handling
- spectator updates and finished-player state changes

## Validation

Every event payload is validated on the server with the zod schemas from `shared/`, in addition to the game-rule validation in the engine. The schemas check payload structure only (types, lengths, unique card IDs, Swap selection pairing); game-rule validation stays in the engine.

## Testing

- **Vitest** (configured in `backend/` and `shared/`) for engine, server, and protocol tests, including seeded randomized invariant tests.
- **Playwright** (planned) for end-to-end tests with multiple browser clients.

## Development Tooling

- `tsx` for running the TypeScript backend in development.
- `tsc` for building the backend.
- `dotenv` for local configuration, with `backend/.env.example` as the template.

## Why This Stack Fits the Project

- **React + TypeScript** gives a structured and type-safe frontend.
- **i18n support** makes the interface available in English, Hungarian, and German.
- **Express** provides a simple and flexible backend layer.
- **PostgreSQL** stores match history and action logs reliably.
- **Socket.IO** supports fast multiplayer interaction with per-player messages.
- **Shared TypeScript types** keep the client and the server protocol consistent.

Together, these technologies cover the full lifecycle of the application: UI, server logic, persistence, and live communication.
