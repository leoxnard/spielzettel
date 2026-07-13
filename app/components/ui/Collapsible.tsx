import type { ReactNode } from "react";

export function Collapsible({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-3xl border border-border/60 bg-surface px-6 py-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-base font-semibold [&::-webkit-details-marker]:hidden">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="transition-transform group-open:rotate-90"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        {summary}
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}
