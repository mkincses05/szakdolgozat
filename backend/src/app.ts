import cors from "cors";
import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { AccountStore } from "./auth/account-store.js";
import { AuthService } from "./auth/auth-service.js";
import type { ServerConfig } from "./config.js";
import { RoomService, type RandomSource } from "./game/room-service.js";
import { createAuthRouter } from "./http/auth-routes.js";
import { consoleLogger, type Logger } from "./logger.js";
import type { MatchResultStore } from "./persistence/match-result-store.js";
import { systemScheduler, type Scheduler } from "./scheduler.js";
import { SocketTransport, registerHandlers, type WildhandServer } from "./socket/register-handlers.js";

export interface ServerDependencies {
  scheduler?: Scheduler;
  logger?: Logger;
  random?: RandomSource;
  /** Where match results are stored; nothing is stored by default. */
  results?: MatchResultStore;
  /** Accounts and login sessions; without them the account API answers `database_unavailable`. */
  accounts?: AccountStore | null;
}

export interface WildhandApp {
  httpServer: HttpServer;
  io: WildhandServer;
  roomService: RoomService;
  close(): Promise<void>;
}

export function createWildhandServer(config: ServerConfig, dependencies: ServerDependencies = {}): WildhandApp {
  const logger = dependencies.logger ?? consoleLogger;
  const scheduler = dependencies.scheduler ?? systemScheduler;
  const now = () => scheduler.now();
  const auth = new AuthService(dependencies.accounts ?? null, now);

  // `credentials` lets the browser send the login cookie to this exact origin.
  const corsOptions = { origin: config.corsOrigin, credentials: true };

  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.use("/api/auth", createAuthRouter({ auth, logger, secureCookies: config.secureCookies, now }));
  // A request body that is not valid JSON gets the same answer as an invalid payload.
  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({ ok: false, code: "invalid_payload" });
      return;
    }
    next(error);
  });

  const httpServer = createServer(app);
  const io: WildhandServer = new Server(httpServer, { cors: corsOptions });
  const transport = new SocketTransport();
  const roomService = new RoomService({
    transport,
    scheduler,
    logger,
    random: dependencies.random,
    results: dependencies.results,
    turnTimeoutMs: config.turnTimeoutMs,
    reconnectGraceMs: config.reconnectGraceMs
  });

  registerHandlers(io, roomService, transport, logger, auth);

  return {
    httpServer,
    io,
    roomService,
    // Running matches are stored as aborted, and the server waits until every result is written.
    close: () =>
      new Promise((resolve) => {
        io.close(() => {
          roomService.dispose();
          void roomService.flushResults().then(resolve);
        });
      })
  };
}
