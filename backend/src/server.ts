import dotenv from "dotenv";
import { createWildhandServer } from "./app.js";
import { loadConfig } from "./config.js";
import { checkDatabase, createPool } from "./db/pool.js";
import { consoleLogger } from "./logger.js";

dotenv.config();

const config = loadConfig();
// The pool is passed to the match result store once results are saved (docs/03 section 2).
const pool = createPool(config.databaseUrl, consoleLogger);
void checkDatabase(pool, consoleLogger);

const { httpServer } = createWildhandServer(config);

httpServer.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
