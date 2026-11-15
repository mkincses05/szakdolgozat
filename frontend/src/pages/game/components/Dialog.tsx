// A modal window: a bottom sheet on phones, and on larger screens a centered panel or a drawer on
// the right side. It closes with the close button, the Escape key, or a click on the backdrop.

import clsx from "clsx";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useEscapeKey } from "../hooks/useEscapeKey";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  placement?: "center" | "side";
}

export function Dialog({ title, onClose, children, placement = "center" }: DialogProps) {
  const { t } = useTranslation("game");
  const titleId = useId();
  useEscapeKey(true, onClose);

  // Rendered into the body, so that no stacking context of the page (top bar, hand) can cover it.
  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50 flex items-end justify-center",
        placement === "center" ? "sm:items-center sm:p-4" : "sm:items-stretch sm:justify-end"
      )}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-surface-sunken/70" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          "relative flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-panel bg-white p-6 text-ink-dark shadow-panel",
          placement === "center"
            ? "animate-pop-in sm:max-w-md sm:rounded-panel"
            : "animate-pop-in sm:max-h-none sm:w-96 sm:animate-drawer-in sm:rounded-none sm:rounded-l-panel"
        )}
      >
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-2xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            aria-label={t("dialog.close")}
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-ink-dark/5 transition-transform hover:scale-110 active:scale-95"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 stroke-current" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body
  );
}
