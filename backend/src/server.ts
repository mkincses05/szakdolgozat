import dotenv from "dotenv";
import { createWildhandServer } from "./app.js";
import { createPgAccountStore } from "./auth/account-store.js";
import { loadConfig } from "./config.js";
import { checkDatabase, createPool } from "./db/pool.js";
import { consoleLogger } from "./logger.js";
import { createPgMatchResultStore, noopMatchResultStore } from "./persistence/match-result-store.js";

dotenv.config();

const config = loadConfig();
const pool = createPool(config.databaseUrl, consoleLogger);
void checkDatabase(pool, consoleLogger);

const app = createWildhandServer(config, {
  results: pool ? createPgMatchResultStore(pool) : noopMatchResultStore,
  accounts: pool ? createPgAccountStore(pool) : null
});

app.httpServer.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});

// A graceful shutdown stores running matches as aborted before the database connection closes.
// A second signal exits immediately.
let shuttingDown = false;
async function shutDown(): Promise<void> {
  if (shuttingDown) {
    process.exit(1);
  }
  shuttingDown = true;
  console.log("Shutting down...");

  try {
    await app.close();
    await pool?.end();
  } catch (error) {
    consoleLogger.error("Shutdown failed", error);
    process.exitCode = 1;
  }
  process.exit();
}

process.on("SIGINT", () => void shutDown());
process.on("SIGTERM", () => void shutDown());
