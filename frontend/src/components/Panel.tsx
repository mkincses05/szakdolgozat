// A rounded, raised box for forms and page sections. Solid on phones; the frosted glass effect is
// only used on larger screens, where it is cheap enough.

import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx(
        "rounded-panel bg-white/95 p-5 text-ink-dark shadow-panel sm:p-6 md:bg-white/80 md:backdrop-blur-md",
        className
      )}
      {...props}
    />
  );
}
