import { ConnectionStatus } from "../components/ConnectionStatus";
import { AccountProvider } from "./AccountProvider";
import { CurrentPage } from "./CurrentPage";
import { ServerStateProvider } from "./ServerStateProvider";

export function App() {
  return (
    <ServerStateProvider>
      <AccountProvider>
        <div className="min-h-dvh">
          <ConnectionStatus />
          <CurrentPage />
        </div>
      </AccountProvider>
    </ServerStateProvider>
  );
}
