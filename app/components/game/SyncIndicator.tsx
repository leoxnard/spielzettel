import { useEffect, useState } from "react";

import { t } from "~/i18n/de";
import { cx } from "~/lib/cx";
import type { SyncStatus } from "~/lib/use-realtime-game";

/**
 * Quiet unless something takes noticeably long: a normal save confirms in
 * well under the delay and never shows the pill at all.
 */
export function SyncIndicator({ status }: { status: SyncStatus }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (status === "synced") {
      setVisible(false);
      return;
    }
    if (status !== "saving") {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible || status === "synced") return null;
  const label =
    status === "saving"
      ? t.game.syncSaving
      : status === "retrying"
        ? t.game.syncRetrying
        : t.game.syncError;
  return (
    <span
      role="status"
      className={cx(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium animate-fade-in-up",
        status === "error" ? "bg-danger/10 text-danger" : "bg-field text-muted",
      )}
    >
      <span
        className={cx(
          "size-1.5 rounded-full bg-current",
          status !== "error" && "animate-live-pulse",
        )}
      />
      {label}
    </span>
  );
}
