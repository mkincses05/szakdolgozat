import clsx from "clsx";
import { useTurnProgress } from "../hooks/useTurnProgress";

const CIRCUMFERENCE = 2 * Math.PI * 46;

interface CountdownRingProps {
  deadline: number | null;
  serverTime: number;
}

/**
 * A ring around the avatar of the player on turn that empties as the turn time runs out. It is its
 * own component, so the timer re-renders only the ring, not the seat or the table.
 */
export function CountdownRing({ deadline, serverTime }: CountdownRingProps) {
  const progress = useTurnProgress(deadline, serverTime);

  if (progress === null) {
    return null;
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute -inset-1.5 -rotate-90">
      <circle cx="50" cy="50" r="46" fill="none" strokeWidth="7" className="stroke-surface-sunken/40" />
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        className={clsx(progress > 0.25 ? "stroke-accent" : "stroke-danger")}
      />
    </svg>
  );
}
