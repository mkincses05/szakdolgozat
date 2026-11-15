import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useLeaveRoom } from "../../hooks/useLeaveRoom";
import { useServerState } from "../../hooks/useServerState";
import { AddBotPanel } from "./components/AddBotPanel";
import { MemberList } from "./components/MemberList";
import { RoomCodeTicket } from "./components/RoomCodeTicket";
import { useBots } from "./hooks/useBots";
import { useStartMatch } from "./hooks/useStartMatch";

export function LobbyPage() {
  const { t } = useTranslation("lobby");
  const { room, session } = useServerState();
  const start = useStartMatch();
  const bots = useBots();
  const leave = useLeaveRoom();

  if (!room || !session) {
    return null;
  }

  const isHost = room.hostUserId === session.userId;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pr-6">
        <h1 className="text-4xl font-bold text-ink-dark">{t("title")}</h1>
        <div className="flex flex-col items-end gap-2">
          <Button variant="secondary" size="sm" disabled={leave.pending} onClick={leave.leaveRoom}>
            {t("leave")}
          </Button>
          <ErrorMessage code={leave.error} />
        </div>
      </header>

      {/* Phones: code, seats, start, bots. Large screens: code and bots left, seats and start right. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <div className="lg:col-start-1 lg:row-start-1">
          <RoomCodeTicket code={room.code} />
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <MemberList
            room={room}
            userId={session.userId}
            onRemoveBot={isHost ? bots.removeBot : undefined}
            removeDisabled={bots.pending}
          />
        </div>

        <div className="flex flex-col items-center gap-3 lg:col-start-2 lg:row-start-3">
          {isHost ? (
            <Button size="lg" className="w-full sm:w-auto sm:min-w-72" disabled={start.pending} onClick={start.startMatch}>
              {t("start")}
            </Button>
          ) : (
            <p className="flex animate-soft-pulse items-center gap-3 rounded-full bg-surface px-6 py-3 text-lg font-semibold text-ink shadow-panel">
              <span aria-hidden="true" className="size-3 rounded-full bg-accent" />
              {t("waitingForHost")}
            </p>
          )}
          <ErrorMessage code={start.error} />
        </div>

        {isHost && (
          <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
            <AddBotPanel disabled={bots.pending} onAdd={bots.addBot} />
            <ErrorMessage code={bots.error} />
          </div>
        )}
      </div>
    </main>
  );
}
