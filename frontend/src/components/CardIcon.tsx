// Symbols of the special cards that are not written as text (+2 is). Decorative: the card itself
// carries the accessible name.

import type { CardKind } from "@wildhand/shared";

export type IconKind = Exclude<CardKind, "number" | "plus2">;

interface CardIconProps {
  kind: IconKind;
  className?: string;
}

export function CardIcon({ kind, className }: CardIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "swap" && (
        <>
          <path d="M4 8.5h14M14.5 5 18 8.5 14.5 12" />
          <path d="M20 15.5H6M9.5 12 6 15.5 9.5 19" />
        </>
      )}
      {kind === "storm" && (
        <>
          <path d="M7 16a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 6.6a3.8 3.8 0 0 1 .6 7.5" />
          <path className="fill-accent stroke-accent" strokeWidth={1.2} d="M13 11.5 9.5 17h3l-1 5 4.5-6.5h-3l1.5-4z" />
        </>
      )}
      {kind === "colorChange" && (
        <g stroke="none">
          <path className="fill-card-red" d="M12 12V3a9 9 0 0 1 9 9z" />
          <path className="fill-card-yellow" d="M12 12h9a9 9 0 0 1-9 9z" />
          <path className="fill-card-green" d="M12 12v9a9 9 0 0 1-9-9z" />
          <path className="fill-card-blue" d="M12 12H3a9 9 0 0 1 9-9z" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={1.6} />
        </g>
      )}
      {kind === "spy" && (
        <>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
