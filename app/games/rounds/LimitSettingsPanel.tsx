import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";

export interface LimitSettings {
  startPlayerId?: string;
  limit?: number | null;
  limitMode?: "win" | "lose";
}

interface LimitSettingsPanelProps {
  settings: LimitSettings;
  patchSettings: (patch: Partial<LimitSettings>) => void;
  /** Hide the win/lose switch for games where it's fixed by the rules. */
  modeEditable?: boolean;
  limitOptional?: boolean;
}

export function LimitSettingsPanel({
  settings,
  patchSettings,
  modeEditable = false,
  limitOptional = true,
}: LimitSettingsPanelProps) {
  const mode = settings.limitMode ?? "win";

  const modeButton = (value: "win" | "lose", label: string) => (
    <button
      type="button"
      onClick={() => patchSettings({ limitMode: value })}
      aria-pressed={mode === value}
      className={cx(
        "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        mode === value ? "bg-surface text-ink shadow-sm" : "text-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm" htmlFor="limit-input">
          {t.rounds.limitLabel}{" "}
          {limitOptional && (
            <span className="text-xs text-muted">{t.rounds.limitOptional}</span>
          )}
        </label>
        <input
          id="limit-input"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={settings.limit ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            patchSettings({
              limit: e.target.value === "" || Number.isNaN(n) ? null : n,
            });
          }}
          className="h-11 w-32 rounded-xl border border-transparent bg-field px-4 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      {modeEditable && (
        <div>
          <span className="mb-1.5 block text-sm">{t.rounds.limitModeLabel}</span>
          <div className="flex max-w-64 gap-1 rounded-xl bg-field p-1">
            {modeButton("win", t.rounds.limitModeWin)}
            {modeButton("lose", t.rounds.limitModeLose)}
          </div>
          {mode === "lose" && (
            <p className="mt-1.5 text-xs text-muted">{t.rounds.lowestWinsNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
