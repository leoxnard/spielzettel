import { Link } from "react-router";

import { t } from "~/i18n/de";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={t.app.name}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-ink shadow-sm">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        {t.app.name}
      </span>
    </Link>
  );
}
