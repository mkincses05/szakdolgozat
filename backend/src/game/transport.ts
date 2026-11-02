import type { ServerToClientEvents } from "@wildhand/shared";

/**
 * Sends a server event to one user. Every message is addressed to a single user, so private data
 * can never reach a room broadcast (R25). Messages to users without a connection are dropped.
 */
export interface Transport {
  send<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void;
}

