import type { ReactNode } from "react";
import { ServerStateContext } from "../hooks/useServerState";
import { useServerConnection } from "./useServerConnection";

export function ServerStateProvider({ children }: { children: ReactNode }) {
  const value = useServerConnection();
  return <ServerStateContext.Provider value={value}>{children}</ServerStateContext.Provider>;
}
