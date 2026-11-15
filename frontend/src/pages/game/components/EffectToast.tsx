// A short notice about a notable event (Storm, a +2 penalty, Swap, Spy, a new draw pile, a finished
// or forfeited player). It fades out by itself and never blocks the table.

import type { MatchView } from "@wildhand/shared";
import { CardIcon } from "../../../components/CardIcon";
import { CrownIcon } from "../../../components/CrownIcon";
import type { LogEntry, LogItem } from "../hooks/useEffectLog";
import { useLogEntryText } from "../hooks/useLogEntryText";
import { SwapResultToast } from "./SwapResultToast";

export function EffectToast({ item, view }: { item: LogItem; view: MatchView }) {
  const text = useLogEntryText(view);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 animate-toast flex-col items-center gap-2 rounded-panel bg-surface/95 px-5 py-3 text-center font-semibold text-ink shadow-panel ring-4 ring-white/70"
    >
      <span className="flex items-center gap-3">
        <EventIcon entry={item.entry} />
        <span className="max-w-md text-sm sm:text-base">{text(item.entry)}</span>
      </span>
      {item.entry.type === "swapResult" && <SwapResultToast result={item.entry.result} />}
    </div>
  );
}

function EventIcon({ entry }: { entry: LogEntry }) {
  const badge = "grid size-10 shrink-0 place-items-center rounded-full text-ink";

  if (entry.type === "swapResult") {
    return (
      <span aria-hidden="true" className={`${badge} bg-card-green`}>
        <CardIcon kind="swap" className="size-6" />
      </span>
    );
  }
  if (entry.type !== "effect") {
    return null;
  }
  const effect = entry.effect;
  switch (effect.type) {
    case "storm":
      return (
        <span aria-hidden="true" className={`${badge} relative bg-card-wild`}>
          <CardIcon kind="storm" className="size-6" />
          <span className="absolute -top-2 -right-2 rounded-full bg-accent px-1.5 text-sm font-bold text-ink-dark">
            {effect.value}
          </span>
        </span>
      );
    case "spy":
      return (
        <span aria-hidden="true" className={`${badge} bg-card-wild`}>
          <CardIcon kind="spy" className="size-6" />
        </span>
      );
    case "swap":
      return (
        <span aria-hidden="true" className={`${badge} bg-card-green`}>
          <CardIcon kind="swap" className="size-6" />
        </span>
      );
    case "penaltyDrawn":
      return (
        <span aria-hidden="true" className={`${badge} bg-danger font-bold`}>
          +{effect.draw.actual}
        </span>
      );
    case "playerFinished":
      return (
        <span aria-hidden="true" className={`${badge} bg-accent-light`}>
          <CrownIcon className="w-6" />
        </span>
      );
    default:
      return null;
  }
}
