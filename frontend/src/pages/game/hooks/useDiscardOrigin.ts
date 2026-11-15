// Who played the current top card, so that it can fly in from that player's seat. This is only
// presentation: when a new top card arrives, it was played by the player who was on turn in the
// previous state. The first state of a match has no origin.

import { useState } from "react";

interface Tracked {
  cardId: string;
  /** The player on turn in the latest state. */
  turnOf: string | null;
  /** The player who played `cardId`. */
  origin: string | null;
}

export function useDiscardOrigin(topCardId: string, currentPlayerId: string | null): string | null {
  const [tracked, setTracked] = useState<Tracked>({ cardId: topCardId, turnOf: currentPlayerId, origin: null });

  if (tracked.cardId !== topCardId) {
    // Adjusting state while rendering: React renders again at once with the new values.
    const next = { cardId: topCardId, turnOf: currentPlayerId, origin: tracked.turnOf };
    setTracked(next);
    return next.origin;
  }
  if (tracked.turnOf !== currentPlayerId) {
    setTracked({ ...tracked, turnOf: currentPlayerId });
  }
  return tracked.origin;
}
