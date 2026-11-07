# Tech Stack Overview

This project uses a TypeScript-based full-stack setup: a React frontend, a Node.js and Express backend, PostgreSQL for persistent data, and Socket.IO for real-time communication.

## Repository Structure

- `backend/`: Express and Socket.IO server, game engine, persistence.
- `frontend/`: React application built with Vite.
- `shared/`: the `@wildhand/shared` ES module package used by both the backend and the frontend: card types, the 104-card deck definition, rule constants, the single-card legality rule (`isPlayableOn`, also used by the engine) with legal-play helpers that work on a player's own view, error codes, client views, Socket.IO event names, typed event maps, and zod payload schemas. Build it with `npm run build` in `shared/` before the backend or frontend uses it.
- `docs/`: technical documentation.

The game engine (`backend/src/engine/`) is a pure TypeScript module without Socket.IO or database dependencies, so it can be tested directly and reused by the headless bot simulator (`docs/03`). Every action takes the current match state and an injectable random number generator, and returns either a new state with the public effects and the private events, or an error code without changing the state. Its tests are in `backend/test/engine/`.

Around the engine, the backend has two more layers:

- `backend/src/game/`: the room service (rooms, sessions, host transfer, reconnect grace periods, duplicate and stale actions) and the match controller (seed, turn timer, delivery of effects, private events, and personal views). It has no Socket.IO dependency; time comes from an injectable scheduler, and messages leave through a transport interface addressed to single users.
- `backend/src/socket/`: the Socket.IO handlers, which validate payloads with the shared zod schemas, answer with acknowledgements, and route each message to the socket of its user.

The server is configured with `PORT`, `CORS_ORIGIN`, `TURN_TIMEOUT_MS`, `RECONNECT_GRACE_MS`, and `DATABASE_URL` (see `backend/.env.example`). `CORS_ORIGIN` must be the exact frontend origin (default `http://localhost:5173`), because the browser sends the login cookie with requests; `*` is rejected. With `NODE_ENV=production`, the login cookie is sent only over HTTPS.

## React + TypeScript

React is used for building the user interface, while TypeScript adds static typing and better developer tooling.

This combination is useful because:

- components can be split into reusable UI parts
- props and state can be typed more safely
- bugs caused by invalid data shapes are easier to catch early
- the codebase stays easier to maintain as the project grows

In this project, React is used for:

- the welcome page with login, registration, and the guest option
- the landing page with language selection and the player's profile
- the lobby
- the gameplay interface, including the player's hand, action controls, turn timer, and Swap, Spy, and Color Change dialogs
- the spectator view for players who have finished
- the results view

Tooling: Vite as the build tool and development server, Tailwind CSS (version 4, through its Vite plugin) for styling, and `clsx` for conditional class names. The frontend connects to the backend with `socket.io-client`; the server URL comes from `VITE_SERVER_URL` (see `frontend/.env.example`). Card rules, event types, and payload schemas come from `@wildhand/shared`, so the frontend never duplicates them.

### Responsibilities of the frontend

The frontend is a presentation layer only; the server decides everything about the game (`docs/02`). The frontend renders the latest `room:state` and `game:state` received from the server and sends the player's intent as a Socket.IO action, which the server validates against the authoritative state.

The frontend contains no game logic. It does not implement game rules, resolve card effects, compute draws, penalties, rankings, or turn order, or decide whether an action is allowed or what it results in. Rule-based hints in the interface, such as highlighting the playable cards, offering the valid Swap and Spy targets, building a combo, offering the cards that can be given with Swap, or labeling the draw button as draw, pass, or penalty, come from the helpers in `@wildhand/shared` (`getLegalCards`, `getValidTargets`, `getComboPartners`, `getSwapOffers`, `getDrawOption`). The helpers are built on the same rule predicates the engine uses (`isPlayableOn`, `isValidTarget`, `isCardLegal`, `drawOptionFor`), so the hints always match the server's validation.

Two kinds of local computation and state are allowed, because they do not affect the game:

- presentation calculations, such as the countdown from `turnDeadline`, corrected by the server clock (`serverTime`), arranging the players around the table, sorting, and formatting;
- interface state, such as the selected cards, open dialogs, hover and focus, and queued animations.

Local game state is not allowed: the frontend never changes the hand, the top card, the current player, or any other game value before the server confirms it (no optimistic updates), and it keeps no separate copy of the match state. If the server rejects an action, for example with `stale_state`, the frontend shows the translated error code and waits for the next state.

### Frontend structure

The frontend uses a feature-based structure in which every page is a feature:

```
frontend/src/
  main.tsx                  entry point
  app/                      root App component, providers, selection of the visible page
  pages/
    <page>/                 welcome, landing, lobby, game, results
      <Page>Page.tsx        page component
      components/           components used only on this page
      hooks/                hooks used only on this page
      locales/              en.json, hu.json, de.json (page namespace)
  components/               components used on more than one page
  hooks/                    hooks used on more than one page
  services/                 Socket.IO client, typed actions, session storage
  utils/                    non-React helpers used on more than one page
  assets/                   images, icons, fonts
  i18n/
    index.ts                i18next setup
    locales/                en.json, hu.json, de.json (common namespace)
  styles/
    animations.css          custom animations
  test/                     test setup
```

New code starts in the folder of the page that uses it and moves to the shared `components/`, `hooks/`, or `utils/` folder only when a second page starts using it. Pages are broken down into small components and custom hooks: components render the interface and may keep simple state that belongs to them alone, such as whether a menu is open; hooks hold all other state, timers, and other side effects, and connect components to the services.

The services are the non-React infrastructure that exists once for the whole application: the single Socket.IO connection, a typed wrapper that sends actions with a generated `actionId` and returns their acknowledgements, the storage of the reconnect token in the browser, and the account API client, which sends its requests with `credentials: "include"` so the browser stores and sends the HttpOnly login cookie. The session is kept in `sessionStorage`: it survives a reload, and every browser tab is a separate player, so a second tab does not take over the first tab's session. On every (re)connect the client resumes the stored session with `session:resume`. They contain no React code and no game logic, so they can be tested without rendering components.

The application keeps only the latest `room:state`, `game:state`, and `game:ended` received from the server and shares them with the pages through a React context. A second context holds the account: the profile from `GET /api/auth/me` and whether the player chose to continue as a guest (kept in `sessionStorage`, so a new tab asks again). After login, registration, or logout the socket reconnects, because the server reads the login cookie only when a socket connects. The visible page is selected from both, without URL routing: outside a room the welcome page until the player logs in or continues as a guest, then the landing page; the lobby in a room without a running match, the gameplay page during a match, and the results page after a match until the player closes it. There is no `types/` folder, because shared types come from `@wildhand/shared`.

### Styling

Tailwind CSS (version 4) provides all regular styling: layout, colors, spacing, and component states such as playable, selected, or disabled cards, with `clsx` for conditional class names. The card colors and other design tokens are defined once in Tailwind's `@theme`. Complex animations and visual effects that utilities cannot express cleanly, such as dealing, playing, or shuffling cards, are written as custom CSS in `frontend/src/styles/animations.css` and registered in `@theme`, so they are used as utility classes as well.

### Internationalization

The frontend supports English, Hungarian, and German with i18next and react-i18next, organized in namespaces. The `common` namespace (`frontend/src/i18n/locales/`) holds texts used on several pages: shared buttons and labels, connection messages, and a translation for every server error code under `errors.<code>`. Every page has its own namespace named after its folder, with the translations in the page's `locales/` folder; these files are collected automatically with Vite's `import.meta.glob`. A test checks that every language defines the same keys in every namespace; a second test checks that every code in `ERROR_CODES` is translated. Errors detected by the client itself (`not_connected`, `no_response`) are translated under `errors.<code>` as well. The language is detected from the browser and remembered locally. Translations cover all user-facing labels, validation messages, error codes returned by the server, status indicators, connection messages, spectator controls, and result screens. The server sends stable error codes, never translated text.

## Express

Express (version 5) is the backend web framework. It handles HTTP requests, routes, middleware, and server-side application logic.

In this project, Express is used for:

- the account API under `/api/auth`: registration, login, logout, and the own profile (`docs/03`)
- serving profiles and statistics (planned)
- health checks
- hosting the Socket.IO server on the same HTTP server

## PostgreSQL

PostgreSQL is the relational database used for persistent storage. The schema is described in `docs/03-data-model-and-intelligent-player.md`.

It stores:

- registered user accounts with their XP and profile counters
- password hashes and login sessions
- a prunable statistics log of finished matches and their players

Rooms, the live match state, guests, bots, and reconnect tokens are kept in server memory. The database is optional: without it, the server runs matches and stores nothing.

- PostgreSQL runs in Docker for development, defined in a docker-compose file in the repository.
- The backend uses the `pg` client with hand-written SQL, without an ORM.
- Schema changes are plain SQL migrations applied by a small runner that records them in `schema_migrations`.
- Passwords are hashed with argon2id.

### Local setup

1. Copy `.env.example` to `.env` in the repository root and `backend/.env.example` to `backend/.env`, and use the same passwords in both.
2. Start the database with `docker compose up -d`. On the first start, `docker/postgres/init/01-setup.sh` creates the `wildhand_app` role and the `wildhand_test` database.
3. Create or update the schema with `npm run db:migrate` in `backend/`. It connects with `MIGRATION_DATABASE_URL` (administrator role) and applies the new files in `backend/migrations/`.
4. Start the backend with `npm run dev`. It connects with `DATABASE_URL` (the restricted `wildhand_app` role); if the variable is empty or the database is unreachable, it logs this and runs without storing anything.

Schema changes are made only by adding a new numbered file to `backend/migrations/` (for example `0002_add_column.sql`); applied files are never edited. Each file runs in its own transaction and is recorded in `schema_migrations`. A new table needs its `GRANT`s for `wildhand_app` in the same migration.

The integration tests in `backend/test/db/` run only when `TEST_DATABASE_URL` is set. They drop the schema of that database, so its name must end in `_test`. In CI, a PostgreSQL service container provides this database.

`docker compose down -v` deletes the database volume together with all data.

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

- **Vitest** (configured in `backend/`, `shared/`, and `frontend/`) for engine, server, and protocol tests, including seeded randomized invariant tests, and for frontend component tests with jsdom and React Testing Library.
- **Playwright** (planned) for end-to-end tests with multiple browser clients.

## Development Tooling

- `tsx` for running the TypeScript backend in development.
- `tsc` for building the backend.
- `dotenv` for local configuration, with `backend/.env.example` as the template.
- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every push to `main` and `develop` and on every pull request to them: it installs, typechecks, tests, and builds `shared/` first and then `backend/`, including the simulator in `backend/tools/`, and `frontend/`.

## Why This Stack Fits the Project

- **React + TypeScript** gives a structured and type-safe frontend.
- **i18n support** makes the interface available in English, Hungarian, and German.
- **Express** provides a simple and flexible backend layer.
- **PostgreSQL** stores user accounts, XP, and match statistics reliably.
- **Socket.IO** supports fast multiplayer interaction with per-player messages.
- **Shared TypeScript types** keep the client and the server protocol consistent.

Together, these technologies cover the full lifecycle of the application: UI, server logic, persistence, and live communication.
