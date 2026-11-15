// The Wildhand wordmark: gold letters with a thick purple outline. Its text is the translated app
// title, so it can be used inside a heading. The size follows the font size of the parent.
// Memoized, because the game table renders it on every update.

import clsx from "clsx";
import { memo } from "react";
import { useTranslation } from "react-i18next";

export const Logo = memo(function Logo({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <span className={clsx("relative inline-block leading-none font-bold tracking-wide uppercase", className)}>
      {/* The outline layer sits behind the gradient text. */}
      <span aria-hidden="true" className="absolute inset-0 text-brand-dark [-webkit-text-stroke:0.16em_var(--color-brand-dark)]">
        {t("common:app.title")}
      </span>
      <span className="relative bg-linear-to-b from-accent-light via-accent to-accent-dark bg-clip-text text-transparent">
        {t("common:app.title")}
      </span>
    </span>
  );
});
