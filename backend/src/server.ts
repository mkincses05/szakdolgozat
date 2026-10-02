import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });
});

const port = Number(process.env.PORT ?? 3000);

httpServer.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
