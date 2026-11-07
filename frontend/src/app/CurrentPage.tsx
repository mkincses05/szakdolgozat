import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../components/ErrorMessage";
import { useServerState } from "../hooks/useServerState";
import { GamePage } from "../pages/game/GamePage";
import { LandingPage } from "../pages/landing/LandingPage";
import { LobbyPage } from "../pages/lobby/LobbyPage";
import { ResultsPage } from "../pages/results/ResultsPage";
import { selectPage } from "./selectPage";

export function CurrentPage() {
  const { t } = useTranslation();
  const state = useServerState();

  switch (selectPage(state)) {
    case "landing":
      return (
        <>
          <ErrorMessage code={state.sessionError} />
          <LandingPage />
        </>
      );
    case "loading":
      return (
        <>
          <ErrorMessage code={state.sessionError} />
          <p>{t("common:status.loading")}</p>
        </>
      );
    case "lobby":
      return <LobbyPage />;
    case "game":
      return <GamePage />;
    case "results":
      return <ResultsPage />;
  }
}
