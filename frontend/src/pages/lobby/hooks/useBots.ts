// Sends `room:addBot` and `room:removeBot` for the host. Whether a bot can be added is decided by the
// server (R1, R24).

import type { BotLevel } from "@wildhand/shared";
import { useAction } from "../../../hooks/useAction";
import { sendAction } from "../../../services/actions";

export function useBots() {
  const { run, pending, error } = useAction();

  return {
    addBot: (level: BotLevel) => void run(() => sendAction("room:addBot", { level })),
    removeBot: (botId: string) => void run(() => sendAction("room:removeBot", { botId })),
    pending,
    error
  };
}
