// The connection to the server. While connected it is only a small green dot (the text is there for
// screen readers); a lost connection gets a banner, and a session taken over by another tab blocks
// the page.

import { useTranslation } from "react-i18next";
import { useServerState } from "../hooks/useServerState";

export function ConnectionStatus() {
  const { t } = useTranslation();
  const { connection } = useServerState();
  const text = t(`common:connection.${connection}`);

  if (connection === "connected") {
    return (
      <p role="status" title={text} className="fixed bottom-3 left-3 z-40">
        <span aria-hidden="true" className="block size-3 rounded-full bg-success ring-2 ring-white" />
        <span className="sr-only">{text}</span>
      </p>
    );
  }

  if (connection === "replaced") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-surface-sunken/85 p-4">
        <p
          role="status"
          className="max-w-sm animate-pop-in rounded-panel bg-surface p-6 text-center text-lg font-medium text-ink shadow-panel"
        >
          {text}
        </p>
      </div>
    );
  }

  return (
    <p
      role="status"
      className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 animate-pop-in items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-panel"
    >
      <span aria-hidden="true" className="relative flex size-3">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-75" />
        <span className="relative inline-flex size-3 rounded-full bg-warning" />
      </span>
      {text}
    </p>
  );
}
