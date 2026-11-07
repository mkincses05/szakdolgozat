import { ROOM_CODE_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";

interface JoinRoomFormProps {
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onJoin: () => void;
  disabled: boolean;
}

export function JoinRoomForm({ roomCode, onRoomCodeChange, onJoin, disabled }: JoinRoomFormProps) {
  const { t } = useTranslation("landing");

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        onJoin();
      }}
    >
      <label className="flex flex-col gap-1">
        {t("roomCode")}
        <input
          className="border p-1"
          value={roomCode}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(event) => onRoomCodeChange(event.target.value)}
        />
      </label>
      <button type="submit" className="border px-2 py-1" disabled={disabled}>
        {t("joinRoom")}
      </button>
    </form>
  );
}
