import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useServerState } from "../../hooks/useServerState";
import { MemberList } from "./components/MemberList";
import { useLeaveRoom } from "../../hooks/useLeaveRoom";
import { useStartMatch } from "./hooks/useStartMatch";

export function LobbyPage() {
  const { t } = useTranslation("lobby");
  const { room, session } = useServerState();
  const start = useStartMatch();
  const leave = useLeaveRoom();

  if (!room || !session) {
    return null;
  }

  const isHost = room.hostUserId === session.userId;

  return (
    <main className="flex max-w-md flex-col gap-4">
      <h1>{t("title")}</h1>
      <p>
        {t("roomCode", { code: room.code })} – {t("shareCode")}
      </p>

      <MemberList room={room} userId={session.userId} />

      {isHost ? (
        <button type="button" className="border px-2 py-1" disabled={start.pending} onClick={start.startMatch}>
          {t("start")}
        </button>
      ) : (
        <p>{t("waitingForHost")}</p>
      )}
      <ErrorMessage code={start.error} />

      <button type="button" className="border px-2 py-1" disabled={leave.pending} onClick={leave.leaveRoom}>
        {t("leave")}
      </button>
      <ErrorMessage code={leave.error} />
    </main>
  );
}
