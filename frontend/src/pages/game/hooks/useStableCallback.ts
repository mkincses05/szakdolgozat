// A function with a stable identity that always calls the latest `callback`. Memoized components
// can then skip rendering without keeping an outdated callback (for example one bound to an old
// `stateVersion`).

import { useCallback, useLayoutEffect, useRef } from "react";

export function useStableCallback<A extends unknown[]>(callback: (...args: A) => void): (...args: A) => void {
  const latest = useRef(callback);

  useLayoutEffect(() => {
    latest.current = callback;
  });

  return useCallback((...args: A) => latest.current(...args), []);
}
