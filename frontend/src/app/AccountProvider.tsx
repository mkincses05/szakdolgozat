import type { ReactNode } from "react";
import { AccountContext } from "../hooks/useAccount";
import { useAccountState } from "./useAccountState";

export function AccountProvider({ children }: { children: ReactNode }) {
  const value = useAccountState();
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
