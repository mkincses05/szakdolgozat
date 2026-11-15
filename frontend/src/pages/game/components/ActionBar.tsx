import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";

interface ActionBarProps {
  canPlay: boolean;
  onPlay: () => void;
}

/** The big play button; drawing is done on the draw pile. */
export function ActionBar({ canPlay, onPlay }: ActionBarProps) {
  const { t } = useTranslation("game");

  return (
    <Button size="lg" className="shrink-0 px-6" disabled={!canPlay} onClick={onPlay}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
        <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
      </svg>
      {t("actions.play")}
    </Button>
  );
}
