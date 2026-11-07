// Sends `game:play` and `game:draw` with the `stateVersion` of the latest `game:state`. Nothing
// changes locally: the result arrives as the next state, or the error code is shown.

import { useState } from "react";
import { useAction } from "../../../hooks/useAction";
import { sendAction, type ActionPayload, type ActionResult } from "../../../services/actions";

export type PlayIntent = Omit<ActionPayload<"game:play">, "stateVersion">;

export function useGameActions(stateVersion: number) {
  const { run, pending, error } = useAction();
  const [errorVersion, setErrorVersion] = useState<number | null>(null);

  const send = async (request: () => Promise<ActionResult<"game:play" | "game:draw">>) => {
    const ack = await run(request);
    setErrorVersion(ack.ok ? null : stateVersion);
  };

  return {
    play: (intent: PlayIntent) => void send(() => sendAction("game:play", { ...intent, stateVersion })),
    draw: () => void send(() => sendAction("game:draw", { stateVersion })),
    pending,
    // An error belongs to the state it was sent for and is hidden once a new state arrives.
    error: errorVersion === stateVersion ? error : null
  };
}
