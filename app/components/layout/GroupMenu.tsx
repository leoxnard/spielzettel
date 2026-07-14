import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { t } from "~/i18n/de";
import {
  clearCurrentGroup,
  setCurrentGroup,
  useCurrentGroup,
} from "~/lib/current-group";
import {
  createGroup,
  GROUP_NAME_TAKEN,
  GROUP_NOT_FOUND,
  GROUP_WRONG_SECRET,
  loginGroup,
} from "~/lib/group-api";
import type { GroupRow } from "~/lib/types";

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
  const [mode, setMode] = useState<"login" | "create">("login");
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Create an open (password-less) group. The visible password field then mirrors
  // the group name, so there's still a real filled type=password field at submit —
  // which is what Chrome AND Safari require to offer "Save password?" — while the
  // group itself is stored with no secret. Open groups accept any password on
  // login, so the manager autofilling the name back in still logs you in.
  const [noPassword, setNoPassword] = useState(true);

  const isCreate = mode === "create";
  const passwordless = isCreate && noPassword;

  const enter = (found: GroupRow) => {
    setCurrentGroup({ id: found.id, code: found.code, name: found.name });
    // Full navigation (not client-side): a real page load right after the form
    // submit is the signal every password manager watches for to offer to save.
    window.location.assign(`/group/${found.code}`);
  };

  const submit = async () => {
    if (!name.trim() || busy) return;
    if (isCreate && !noPassword && !secret.trim()) return;
    setBusy(true);
    setError("");
    try {
      const found =
        mode === "login"
          ? await loginGroup(name, secret)
          : // Passwordless create → stored with no secret; the name-as-password
            // in the field is only there for the password manager.
            await createGroup(name, noPassword ? "" : secret);
      enter(found);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (mode === "login" && code === GROUP_NOT_FOUND) {
        // No such group — steer the user straight into creating it.
        setError(t.group.notFound);
        setMode("create");
      } else if (mode === "login" && code === GROUP_WRONG_SECRET) {
        setError(t.group.wrongSecret);
      } else if (mode === "create" && code === GROUP_NAME_TAKEN) {
        setError(t.group.nameTaken);
      } else {
        setError(t.error.saveFailed);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        className="inline-flex h-9 max-w-40 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium shadow-sm transition-colors hover:bg-field"
      >
        <GroupIcon />
        <span className="truncate">
          {group ? group.name || t.group.unnamed : t.group.enterCta}
        </span>
      </button>

      {open && (
        // Padding (not margin) keeps the gap under the button inside the hover
        // area, so moving the cursor onto the menu doesn't close it.
        <div className="absolute right-0 top-full z-50 w-64 pt-2">
          <div className="w-64 rounded-2xl border border-border bg-surface p-3 shadow-lg animate-fade-in">
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
                      // The group page loads from the URL, so clearing alone
                      // would leave you sitting on it — send you home.
                      navigate("/");
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
              {isCreate
                ? t.group.createLabel
                : group
                  ? t.group.switchLabel
                  : t.group.loginLabel}
            </p>
            {/* A real login/registration form with autocomplete hints so the
                browser's password manager offers to save & fill name + secret. */}
            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                value={name}
                name="username"
                // Creating: don't let the browser suggest existing group names.
                autoComplete={isCreate ? "off" : "username"}
                placeholder={t.group.namePlaceholder}
                maxLength={40}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className="h-9 w-full rounded-lg border border-transparent bg-field px-3 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex gap-1.5">
                <input
                  // Passwordless create: mirror the name so there's a real,
                  // filled, *visible* password field for the manager to save,
                  // while the group is stored open.
                  value={passwordless ? name : secret}
                  readOnly={passwordless}
                  type="password"
                  name="password"
                  // "off" (not "new-password") on create suppresses the browser's
                  // "Suggest Strong Password" popup; browsers still offer to SAVE
                  // on submit, so the group name is still remembered.
                  autoComplete={isCreate ? "off" : "current-password"}
                  placeholder={
                    passwordless
                      ? ""
                      : isCreate
                        ? t.group.createPasswordPlaceholder
                        : t.group.passwordPlaceholder
                  }
                  maxLength={40}
                  onChange={(e) => {
                    if (passwordless) return;
                    setSecret(e.target.value);
                    setError("");
                  }}
                  className={`h-9 w-full rounded-lg border border-transparent bg-field px-3 text-sm focus:border-primary focus:outline-none ${
                    // Mirror the name for the password manager, but hide the dots
                    // (transparent text + caret) so it reads as "no password".
                    passwordless ? "text-transparent caret-transparent select-none" : ""
                  }`}
                />
                <button
                  type="submit"
                  disabled={
                    busy ||
                    !name.trim() ||
                    (isCreate && !noPassword && !secret.trim())
                  }
                  className="shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isCreate ? t.group.create : t.group.login}
                </button>
              </div>
              {isCreate && (
                <label className="flex cursor-pointer items-center gap-2 px-1 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={noPassword}
                    onChange={(e) => {
                      setNoPassword(e.target.checked);
                      setSecret("");
                      setError("");
                    }}
                    className="size-3.5 accent-primary"
                  />
                  {t.group.noPasswordLabel}
                </label>
              )}
              {error && <p className="px-1 text-xs text-danger">{error}</p>}
              <p className="px-1 text-xs text-muted">
                {isCreate
                  ? noPassword
                    ? t.group.noPasswordHint
                    : t.group.createHint
                  : t.group.loginHint}
              </p>
            </form>

            <div className="mt-2 border-t border-border/60 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(isCreate ? "login" : "create");
                  setError("");
                }}
                className="w-full rounded-lg px-2 py-1.5 text-center text-sm font-medium text-primary transition-colors hover:bg-field"
              >
                {isCreate ? t.group.backToLogin : t.group.createToggle}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
