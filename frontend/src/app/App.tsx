import { ConnectionStatus } from "../components/ConnectionStatus";
import { AccountProvider } from "./AccountProvider";
import { CurrentPage } from "./CurrentPage";
import { ServerStateProvider } from "./ServerStateProvider";

export function App() {
  return (
    <ServerStateProvider>
      <AccountProvider>
        <div className="flex flex-col gap-4 p-4">
          <ConnectionStatus />
          <CurrentPage />
        </div>
      </AccountProvider>
    </ServerStateProvider>
  );
}
