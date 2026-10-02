import { NavLink } from "react-router";

import { t } from "~/i18n/de";
import { cx } from "~/lib/cx";
import { GroupMenu } from "./GroupMenu";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="relative z-50 border-b border-border/60 bg-surface/70 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <NavLink
            to="/katalog"
            className={({ isActive }) =>
              cx(
                "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3 text-sm font-medium transition-colors hover:bg-field",
                isActive ? "bg-primary-soft text-primary" : "text-ink",
              )
            }
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="11" height="16" rx="2" />
              <path d="m14 7 4.5 1.2a2 2 0 0 1 1.4 2.4l-2.3 8.7a2 2 0 0 1-2.4 1.4L12 20" />
            </svg>
            <span className="sr-only sm:not-sr-only">{t.catalog.nav}</span>
          </NavLink>
          <GroupMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
