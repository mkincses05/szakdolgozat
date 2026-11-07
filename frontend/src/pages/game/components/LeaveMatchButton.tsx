import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "../../../components/ErrorMessage";
import { useLeaveRoom } from "../../../hooks/useLeaveRoom";

/** An active player forfeits by leaving (R23), so they confirm it first. */
export function LeaveMatchButton({ forfeits }: { forfeits: boolean }) {
  const { t } = useTranslation("game");
  const leave = useLeaveRoom();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex flex-col gap-2">
      {/* A player who finishes while confirming no longer forfeits by leaving. */}
      {confirming && forfeits ? (
        <>
          <p>{t("leave.warning")}</p>
          <div className="flex gap-2">
            <button type="button" className="border px-2 py-1" disabled={leave.pending} onClick={leave.leaveRoom}>
              {t("leave.confirm")}
            </button>
            <button type="button" className="border px-2 py-1" onClick={() => setConfirming(false)}>
              {t("leave.cancel")}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="border px-2 py-1"
          disabled={leave.pending}
          onClick={forfeits ? () => setConfirming(true) : leave.leaveRoom}
        >
          {t("leave.button")}
        </button>
      )}
      <ErrorMessage code={leave.error} />
    </section>
  );
}
