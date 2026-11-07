// The single Socket.IO connection of the application. It is opened by the app when it mounts;
// every action and server event goes through this socket.

import type { ClientToServerEvents, ServerToClientEvents } from "@wildhand/shared";
import { io, type Socket } from "socket.io-client";
import { SERVER_URL } from "./serverUrl";

export type WildhandSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// `withCredentials` sends the login cookie with the handshake, so the server knows the account.
export const socket: WildhandSocket = io(SERVER_URL, { autoConnect: false, withCredentials: true });
