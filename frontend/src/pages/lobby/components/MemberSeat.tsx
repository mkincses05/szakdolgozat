import type { RoomMemberView } from "@wildhand/shared";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../components/Avatar";
import { useBotLabel } from "../../../hooks/useBotLabel";

interface MemberSeatProps {
  member: RoomMemberView;
  isYou: boolean;
  isHost: boolean;
  /** Given to the host only, for bots. */
  onRemove?: () => void;
  removeDisabled: boolean;
}

export function MemberSeat({ member, isYou, isHost, onRemove, removeDisabled }: MemberSeatProps) {
  const { t } = useTranslation("lobby");
  const botLabel = useBotLabel();
  const connected = member.presence === "connected";

  const tags = [
    member.botLevel !== null && botLabel(member.botLevel),
    isYou && t("you"),
    isHost && t("host")
  ].filter((tag): tag is string => Boolean(tag));

  return (
    <li
      className={clsx(
        "relative flex animate-pop-in flex-col items-center gap-1.5 rounded-3xl bg-white px-2 pt-6 pb-3 text-center shadow-card",
        isYou && "ring-4 ring-accent"
      )}
    >
      <Avatar userId={member.userId} isBot={member.isBot} crown={isHost} dimmed={!connected} />
      <p className="w-full truncate text-lg font-bold">{member.displayName}</p>
      <ul className="flex flex-wrap justify-center gap-1 text-xs font-semibold">
        {tags.map((tag) => (
          <li key={tag} className="rounded-full bg-brand/10 px-2 py-0.5 text-brand-dark">
            {tag}
          </li>
        ))}
        <li
          className={clsx(
            "flex items-center gap-1 rounded-full px-2 py-0.5",
            connected ? "bg-success/15 text-card-green-dark" : "bg-ink-dark/10 text-ink-soft"
          )}
        >
          <span aria-hidden="true" className={clsx("size-2 rounded-full", connected ? "bg-success" : "bg-ink-soft")} />
          {t(`common:presence.${member.presence}`)}
        </li>
      </ul>
      {onRemove && (
        <button
          type="button"
          aria-label={t("bots.remove", { name: member.displayName })}
          className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-full bg-danger text-ink shadow-button transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={removeDisabled}
          onClick={onRemove}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 stroke-current" strokeWidth="3" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </li>
  );
}
