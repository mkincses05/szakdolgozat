/** A decorative crown, used by the logo, the card back, and the host's or winner's avatar. */
export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" aria-hidden="true" className={className}>
      <path
        className="fill-accent stroke-accent-dark"
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M2.5 6 7.5 10 12 2.5l4.5 7.5 5-4-2 11.5h-15z"
      />
      <circle className="fill-card-red" cx="12" cy="13.5" r="1.6" />
      <circle className="fill-card-blue" cx="7.5" cy="14" r="1.2" />
      <circle className="fill-card-green" cx="16.5" cy="14" r="1.2" />
    </svg>
  );
}
