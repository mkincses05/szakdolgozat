import { ROOM_CODE_LENGTH } from "@wildhand/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { TextField } from "../../../components/TextField";

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
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onJoin();
      }}
    >
      <TextField
        label={t("roomCode")}
        value={roomCode}
        onChange={onRoomCodeChange}
        autoComplete="off"
        maxLength={ROOM_CODE_LENGTH}
        variant="code"
      />
      <Button type="submit" variant="secondary" disabled={disabled}>
        {t("joinRoom")}
      </Button>
    </form>
  );
}
