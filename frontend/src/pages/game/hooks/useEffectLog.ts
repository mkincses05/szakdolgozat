// The latest public effects and the private Spy and Swap results received during the match,
// newest first.

import type { GameEffect, SpyReveal, SwapResult } from "@wildhand/shared";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../../services/socket";

const LOG_LIMIT = 20;

export type LogEntry =
  | { type: "effect"; effect: GameEffect }
  | { type: "spyReveal"; reveal: SpyReveal }
  | { type: "swapResult"; result: SwapResult };

export interface LogItem {
  id: number;
  entry: LogEntry;
}

export function useEffectLog(): LogItem[] {
  const [items, setItems] = useState<LogItem[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const add = (entry: LogEntry) => {
      const id = nextId.current++;
      setItems((previous) => [{ id, entry }, ...previous].slice(0, LOG_LIMIT));
    };
    const onEffect = (effect: GameEffect) => add({ type: "effect", effect });
    const onSpyReveal = (reveal: SpyReveal) => add({ type: "spyReveal", reveal });
    const onSwapResult = (result: SwapResult) => add({ type: "swapResult", result });

    socket.on("game:effect", onEffect);
    socket.on("game:spyReveal", onSpyReveal);
    socket.on("game:swapResult", onSwapResult);
    return () => {
      socket.off("game:effect", onEffect);
      socket.off("game:spyReveal", onSpyReveal);
      socket.off("game:swapResult", onSwapResult);
    };
  }, []);

  return items;
}
