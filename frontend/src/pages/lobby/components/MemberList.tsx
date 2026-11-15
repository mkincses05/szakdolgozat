import type { RoomView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Panel } from "../../../components/Panel";
import { MemberSeat } from "./MemberSeat";

interface MemberListProps {
  room: RoomView;
  userId: string;
  /** Given to the host only: bots can be removed in the lobby. */
  onRemoveBot?: (botId: string) => void;
  removeDisabled?: boolean;
}

/** The seats of the room: the members in join order, then the free seats up to the room limit. */
export function MemberList({ room, userId, onRemoveBot, removeDisabled = false }: MemberListProps) {
  const { t } = useTranslation("lobby");
  const freeSeats = Math.max(0, room.maxPlayers - room.members.length);

  return (
    <Panel className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{t("players", { count: room.members.length, max: room.maxPlayers })}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {room.members.map((member) => (
          <MemberSeat
            key={member.userId}
            member={member}
            isYou={member.userId === userId}
            isHost={member.userId === room.hostUserId}
            onRemove={member.isBot && onRemoveBot ? () => onRemoveBot(member.userId) : undefined}
            removeDisabled={removeDisabled}
          />
        ))}
        {Array.from({ length: freeSeats }, (_, index) => (
          <li
            key={index}
            className="grid min-h-36 animate-soft-pulse place-items-center rounded-3xl border-3 border-dashed border-ink-dark/20 p-3 text-center font-semibold text-ink-soft"
          >
            {t("emptySeat")}
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-soft">{t("minPlayers", { min: room.minPlayers })}</p>
    </Panel>
  );
}
