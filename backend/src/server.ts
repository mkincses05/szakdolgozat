import dotenv from "dotenv";
import { createWildhandServer } from "./app.js";
import { loadConfig } from "./config.js";

dotenv.config();

const config = loadConfig();
const { httpServer } = createWildhandServer(config);

httpServer.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
