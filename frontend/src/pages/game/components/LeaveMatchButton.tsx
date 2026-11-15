import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { useLeaveRoom } from "../../../hooks/useLeaveRoom";

/** An active player forfeits by leaving (R23), so they confirm it first. */
export function LeaveMatchButton({ forfeits }: { forfeits: boolean }) {
  const { t } = useTranslation("game");
  const leave = useLeaveRoom();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      {/* A player who finishes while confirming no longer forfeits by leaving. */}
      {confirming && forfeits ? (
        <div className="flex animate-pop-in flex-col gap-3 rounded-2xl bg-danger/10 p-4">
          <p className="font-semibold text-card-red-dark">{t("leave.warning")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" disabled={leave.pending} onClick={leave.leaveRoom}>
              {t("leave.confirm")}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t("leave.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          disabled={leave.pending}
          onClick={forfeits ? () => setConfirming(true) : leave.leaveRoom}
        >
          {t("leave.button")}
        </Button>
      )}
      <ErrorMessage code={leave.error} />
    </section>
  );
}
