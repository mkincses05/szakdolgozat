import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { FormMessage } from "../../../components/FormMessage";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

/** The room code as a big ticket that can be copied and shared. */
export function RoomCodeTicket({ code }: { code: string }) {
  const { t } = useTranslation("lobby");
  const clipboard = useCopyToClipboard();

  return (
    <section className="relative flex flex-col items-center gap-3 overflow-hidden rounded-panel bg-linear-to-br from-brand-light via-brand to-brand-dark p-6 text-center text-ink shadow-panel">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-2 bg-(image:--gradient-rainbow)" />
      <h2 className="text-sm font-semibold tracking-widest text-ink-muted uppercase">{t("roomCodeLabel")}</h2>
      <p className="font-mono text-5xl font-bold tracking-[0.2em] text-shadow-lg sm:text-6xl">{code}</p>
      <p className="text-ink-muted">{t("shareCode")}</p>
      <Button variant="secondary" onClick={() => void clipboard.copy(code)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 stroke-brand" fill="none" strokeWidth="2.2">
          <rect x="8" y="8" width="12" height="12" rx="3" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
        <span aria-live="polite">{clipboard.state === "copied" ? t("copied") : t("copyCode")}</span>
      </Button>
      {clipboard.state === "failed" && <FormMessage>{t("copyFailed")}</FormMessage>}
    </section>
  );
}
