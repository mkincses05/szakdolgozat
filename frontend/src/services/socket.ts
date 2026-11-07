// The single Socket.IO connection of the application. It is opened by the app when it mounts;
// every action and server event goes through this socket.

import type { ClientToServerEvents, ServerToClientEvents } from "@wildhand/shared";
import { io, type Socket } from "socket.io-client";

export type WildhandSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** `VITE_SERVER_URL` from `.env`, otherwise the backend's default local address. */
const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

// `withCredentials` sends the login cookie with the handshake, so the server knows the account.
export const socket: WildhandSocket = io(SERVER_URL, { autoConnect: false, withCredentials: true });
