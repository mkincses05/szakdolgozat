import clsx from "clsx";
import { memo } from "react";
import { CardBack } from "../../../components/CardBack";

/** At most this many backs are drawn; the badge next to the avatar shows the real count. */
const MAX_BACKS = 5;

/** A small fan of card backs that shows roughly how many cards a player holds. Decorative. */
export const MiniFan = memo(function MiniFan({ count, className }: { count: number; className?: string }) {
  const shown = Math.min(count, MAX_BACKS);
  const middle = (shown - 1) / 2;

  if (shown === 0) {
    return null;
  }
  return (
    <span aria-hidden="true" className={clsx("relative h-[46px] w-[72px] justify-center", className)}>
      {Array.from({ length: shown }, (_, index) => (
        <CardBack
          key={index}
          size="xs"
          className="absolute! bottom-0 left-1/2 -ml-[2.8em] origin-bottom"
          style={{ rotate: `${(index - middle) * 12}deg` }}
        />
      ))}
    </span>
  );
});
