// Sends `game:play` and `game:draw` with the `stateVersion` of the latest `game:state`. Nothing
// changes locally: the result arrives as the next state, or the error code is shown.

import { useState } from "react";
import { sendAction, type ActionErrorCode, type ActionPayload, type ActionResult } from "../../../services/actions";

export type PlayIntent = Omit<ActionPayload<"game:play">, "stateVersion">;

interface ActionError {
  stateVersion: number;
  code: ActionErrorCode;
}

export function useGameActions(stateVersion: number) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const run = async (request: Promise<ActionResult<"game:play" | "game:draw">>) => {
    setError(null);
    setPending(true);
    const ack = await request;
    setPending(false);
    if (!ack.ok) {
      setError({ stateVersion, code: ack.code });
    }
  };

  return {
    play: (intent: PlayIntent) => void run(sendAction("game:play", { ...intent, stateVersion })),
    draw: () => void run(sendAction("game:draw", { stateVersion })),
    pending,
    // An error belongs to the state it was sent for and is hidden once a new state arrives.
    error: error?.stateVersion === stateVersion ? error.code : null
  };
}
