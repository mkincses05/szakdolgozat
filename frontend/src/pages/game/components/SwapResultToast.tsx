import type { SwapResult } from "@wildhand/shared";
import { PlayingCard } from "../../../components/PlayingCard";

/** The two exchanged cards of a Swap, shown only to the two players involved (R12). */
export function SwapResultToast({ result }: { result: SwapResult }) {
  return (
    <span aria-hidden="true" className="flex items-center justify-center gap-2">
      <PlayingCard card={result.given} size="sm" className="-rotate-6" />
      <svg viewBox="0 0 24 24" className="size-7 stroke-current" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.5h14M14.5 5 18 8.5 14.5 12M20 15.5H6M9.5 12 6 15.5 9.5 19" />
      </svg>
      <PlayingCard card={result.received} size="sm" className="rotate-6" />
    </span>
  );
}
