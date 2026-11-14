import type { RoomView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { useBotLabel } from "../../../hooks/useBotLabel";

interface MemberListProps {
  room: RoomView;
  userId: string;
  /** Given to the host only: bots can be removed in the lobby. */
  onRemoveBot?: (botId: string) => void;
  removeDisabled?: boolean;
}

export function MemberList({ room, userId, onRemoveBot, removeDisabled = false }: MemberListProps) {
  const { t } = useTranslation("lobby");
  const botLabel = useBotLabel();

  return (
    <section className="flex flex-col gap-1">
      <h2>{t("players", { count: room.members.length, max: room.maxPlayers })}</h2>
      <ul className="list-disc pl-6">
        {room.members.map((member) => {
          const tags = [
            member.botLevel !== null && botLabel(member.botLevel),
            member.userId === userId && t("you"),
            member.userId === room.hostUserId && t("host")
          ].filter(Boolean);

          return (
            <li key={member.userId}>
              {member.displayName}
              {tags.length > 0 && ` (${tags.join(", ")})`} – {t(`common:presence.${member.presence}`)}
              {member.isBot && onRemoveBot && (
                <button
                  type="button"
                  className="ml-2 border px-2"
                  disabled={removeDisabled}
                  onClick={() => onRemoveBot(member.userId)}
                >
                  {t("bots.remove", { name: member.displayName })}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p>{t("minPlayers", { min: room.minPlayers })}</p>
    </section>
  );
}
