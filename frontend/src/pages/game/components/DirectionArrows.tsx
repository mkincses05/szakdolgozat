import { memo } from "react";
import { useTranslation } from "react-i18next";

/** Two faint arrows on the felt: play always goes clockwise (R3). Memoized: it never changes. */
export const DirectionArrows = memo(function DirectionArrows() {
  const { t } = useTranslation("game");

  return (
    <>
      <svg
        viewBox="0 0 200 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-[6%] h-[88%] w-[88%] stroke-white/40"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <defs>
          <marker id="direction-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0 0 10 5 0 10z" className="fill-white/50" stroke="none" />
          </marker>
        </defs>
        {/* Left side goes up, right side goes down: clockwise as seen from above. */}
        <path d="M34 78Q12 50 34 22" markerEnd="url(#direction-arrow)" />
        <path d="M166 22Q188 50 166 78" markerEnd="url(#direction-arrow)" />
      </svg>
      <p className="sr-only">{t("table.direction")}</p>
    </>
  );
});
