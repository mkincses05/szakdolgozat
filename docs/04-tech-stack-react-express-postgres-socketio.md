# Tech Stack Overview

This project uses a modern full-stack setup with a TypeScript-based frontend, a Node.js backend, a relational database, and real-time communication.

## React + TypeScript
React is used for building the user interface, while TypeScript adds static typing and better developer tooling.

This combination is useful because:
- components can be split into reusable UI parts
- props and state can be typed more safely
- bugs caused by invalid data shapes are easier to catch early
- the codebase stays easier to maintain as the project grows

In this project, React is a good fit for:
- lobby and room screens
- the main gameplay interface
- player hand and action controls
- result and summary views

## Express
Express is the backend web framework. It handles HTTP requests, routes, middleware, and server-side application logic.

In this project, Express can be used for:
- creating the API layer
- serving basic game and user endpoints
- handling authentication or session-related logic if needed
- connecting HTTP requests with the realtime Socket.IO layer

## PostgreSQL
PostgreSQL is the relational database used for persistent storage.

It is suitable for storing:
- users
- rooms
- match history
- results and statistics
- long-term game records

PostgreSQL is a strong choice because it supports structured data well and works reliably with relational game entities.

## Socket.IO
Socket.IO is used for real-time communication between the client and server.

It is important for:
- live game updates
- player actions
- room synchronization
- turn changes
- penalty updates
- reconnect handling

Socket.IO is especially useful in a multiplayer game because the server can push changes instantly to all connected players.

## Why this stack fits the project
- **React + TypeScript** gives a structured and type-safe frontend
- **Express** provides a simple and flexible backend layer
- **PostgreSQL** stores persistent game data reliably
- **Socket.IO** supports fast multiplayer interaction in real time

Together, these technologies cover the full lifecycle of the application: UI, server logic, persistence, and live communication.