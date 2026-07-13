import { useState } from "react";
import { useNavigate } from "react-router";

import { Card } from "~/components/ui/Card";
import { t } from "~/i18n/de";
import { fetchGameByCode } from "~/lib/game-api";
import { CODE_LENGTH, normalizeCode } from "~/lib/game-code";

export function JoinByCode() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCode(value);
    if (!code) {
      setError(t.home.joinInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const game = await fetchGameByCode(code);
      if (game) navigate(`/game/${code}`);
      else setError(t.home.joinNotFound);
    } catch {
      setError(t.error.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <form
        onSubmit={join}
        className="flex flex-col gap-4 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
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
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="m10 17 5-5-5-5M15 12H3" />
            </svg>
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {t.home.joinTitle}
            </h3>
            <p className="mt-0.5 text-sm text-muted">{t.home.joinSubtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder={t.home.joinPlaceholder}
            maxLength={CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label={t.lobby.codeLabel}
            className="h-11 w-full rounded-xl bg-field px-4 font-mono text-sm tracking-[0.2em] text-ink placeholder:tracking-normal placeholder:text-muted/70 border border-transparent focus:border-primary focus:outline-none sm:w-40"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label={t.home.joinTitle}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-primary-ink disabled:opacity-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}
