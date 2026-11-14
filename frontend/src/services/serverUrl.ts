// The backend address, used by the Socket.IO connection and the account API.

/** `VITE_SERVER_URL` from `.env`, otherwise the backend's default local address. */
export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";
