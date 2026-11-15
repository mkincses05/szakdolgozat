// A problem the player has to fix, such as an invalid field or a rejected action.

import clsx from "clsx";
import type { ReactNode } from "react";

export function FormMessage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={clsx(
        "flex w-fit animate-pop-in items-center gap-2 rounded-2xl bg-danger px-4 py-2 font-medium text-ink shadow-panel",
        className
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
        <circle cx="12" cy="12" r="10" className="fill-white" />
        <path d="M12 6.5v7" className="stroke-danger" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="12" cy="17.3" r="1.5" className="fill-danger" />
      </svg>
      {children}
    </p>
  );
}
