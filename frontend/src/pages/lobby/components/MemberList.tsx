import type { RoomView } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface MemberListProps {
  room: RoomView;
  userId: string;
}

export function MemberList({ room, userId }: MemberListProps) {
  const { t } = useTranslation("lobby");

  return (
    <section className="flex flex-col gap-1">
      <h2>{t("players", { count: room.members.length, max: room.maxPlayers })}</h2>
      <ul className="list-disc pl-6">
        {room.members.map((member) => {
          const tags = [
            member.userId === userId && t("you"),
            member.userId === room.hostUserId && t("host")
          ].filter(Boolean);

          return (
            <li key={member.userId}>
              {member.displayName}
              {tags.length > 0 && ` (${tags.join(", ")})`} – {t(`presence.${member.presence}`)}
            </li>
          );
        })}
      </ul>
      <p>{t("minPlayers", { min: room.minPlayers })}</p>
    </section>
  );
}
