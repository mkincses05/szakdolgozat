import { ConnectionStatus } from "../components/ConnectionStatus";
import { CurrentPage } from "./CurrentPage";
import { ServerStateProvider } from "./ServerStateProvider";

export function App() {
  return (
    <ServerStateProvider>
      <div className="flex flex-col gap-4 p-4">
        <ConnectionStatus />
        <CurrentPage />
      </div>
    </ServerStateProvider>
  );
}
