import { useTranslation } from "react-i18next";
import { CardBack } from "./CardBack";

/** Two cards shuffling into each other while the session or the room is being loaded. */
export function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div aria-hidden="true" className="relative h-[8.4em] w-[5.6em] text-[11px] sm:text-[13px]">
        <CardBack className="absolute! inset-0 animate-shuffle-left" />
        <CardBack className="absolute! inset-0 animate-shuffle-right" />
      </div>
      <p className="text-xl font-semibold text-ink-dark">{t("common:status.loading")}</p>
    </div>
  );
}
