import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { t } from "~/i18n/de";
import {
  clearCurrentGroup,
  setCurrentGroup,
  useCurrentGroup,
} from "~/lib/current-group";
import { joinGroup } from "~/lib/group-api";

function GroupIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function GroupMenu() {
  const group = useCurrentGroup();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState(group?.playerName ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const enter = async () => {
    if (!name.trim() || !userName.trim()) return;
    setBusy(true);
    try {
      const found = await joinGroup(name, userName);
      setCurrentGroup({
        id: found.id,
        code: found.code,
        name: found.name,
        playerName: userName.trim(),
      });
      setName("");
      setOpen(false);
      navigate(`/group/${found.code}`);
    } catch {
      alert(t.error.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 max-w-40 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium shadow-sm transition-colors hover:bg-field"
      >
        <GroupIcon />
        <span className="truncate">
          {group ? group.name || t.group.unnamed : t.group.enterCta}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-border bg-surface p-3 shadow-lg animate-fade-in">
            {group && (
              <div className="mb-3 border-b border-border/60 pb-3">
                <p className="px-1 text-xs text-muted">{t.group.currentGroup}</p>
                <p className="truncate px-1 font-display text-base font-semibold">
                  {group.name || t.group.unnamed}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <Link
                    to={`/group/${group.code}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-field"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 3v18h18" />
                      <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                    {t.group.viewStats}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      clearCurrentGroup();
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-danger transition-colors hover:bg-field"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5M21 12H9" />
                    </svg>
                    {t.group.logout}
                  </button>
                </div>
              </div>
            )}

            <p className="mb-1.5 px-1 text-xs text-muted">
              {group ? t.group.switchLabel : t.group.enterLabel}
            </p>
            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                enter();
              }}
            >
              <input
                value={userName}
                placeholder={t.group.userPlaceholder}
                maxLength={40}
                autoFocus
                onChange={(e) => setUserName(e.target.value)}
                className="h-9 w-full rounded-lg border border-transparent bg-field px-3 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex gap-1.5">
                <input
                  value={name}
                  placeholder={t.group.namePlaceholder}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-transparent bg-field px-3 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !name.trim() || !userName.trim()}
                  className="shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {t.group.go}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
