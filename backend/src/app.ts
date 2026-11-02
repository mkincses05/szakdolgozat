import cors from "cors";
import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ServerConfig } from "./config.js";
import { RoomService, type RandomSource } from "./game/room-service.js";
import { consoleLogger, type Logger } from "./logger.js";
import { systemScheduler, type Scheduler } from "./scheduler.js";
import { SocketTransport, registerHandlers, type WildhandServer } from "./socket/register-handlers.js";

export interface ServerDependencies {
  scheduler?: Scheduler;
  logger?: Logger;
  random?: RandomSource;
}

export interface WildhandApp {
  httpServer: HttpServer;
  io: WildhandServer;
  roomService: RoomService;
  close(): Promise<void>;
}

export function createWildhandServer(config: ServerConfig, dependencies: ServerDependencies = {}): WildhandApp {
  const logger = dependencies.logger ?? consoleLogger;

  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  const io: WildhandServer = new Server(httpServer, { cors: { origin: config.corsOrigin } });
  const transport = new SocketTransport();
  const roomService = new RoomService({
    transport,
    scheduler: dependencies.scheduler ?? systemScheduler,
    logger,
    random: dependencies.random,
    turnTimeoutMs: config.turnTimeoutMs,
    reconnectGraceMs: config.reconnectGraceMs
  });

  registerHandlers(io, roomService, transport, logger);

  return {
    httpServer,
    io,
    roomService,
    close: () =>
      new Promise((resolve) => {
        io.close(() => {
          roomService.dispose();
          resolve();
        });
      })
  };
}
