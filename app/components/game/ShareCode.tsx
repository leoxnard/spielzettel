import { useState } from "react";

import { t } from "~/i18n/de";

export function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${location.origin}/game/${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.app.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm shadow-sm transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-primary"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      <span className="font-mono font-semibold tracking-[0.2em]">{code}</span>
      <span className="text-muted">·</span>
      <span className="text-muted">{copied ? t.lobby.copied : t.lobby.share}</span>
    </button>
  );
}
