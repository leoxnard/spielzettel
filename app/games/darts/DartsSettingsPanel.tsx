import { Switch } from "~/components/ui/Switch";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { GameSettingsPanelProps } from "../types";
import { resolveSettings, X01_STARTS } from "./logic";
import type { DartsSettings } from "./types";

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex max-w-80 gap-1 rounded-xl bg-field p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            "h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function DartsSettingsPanel({
  settings,
  patchSettings,
}: GameSettingsPanelProps<DartsSettings>) {
  const s = resolveSettings(settings);
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm">{t.darts.modeLabel}</span>
        <Segmented
          value={s.mode}
          options={[
            { value: "x01", label: t.darts.modeX01 },
            { value: "cricket", label: t.darts.modeCricket },
          ]}
          onChange={(mode) => patchSettings({ mode })}
        />
      </div>
      {s.mode === "x01" ? (
        <>
          <div>
            <span className="mb-1.5 block text-sm">{t.darts.startLabel}</span>
            <Segmented
              value={s.start}
              options={X01_STARTS.map((n) => ({ value: n, label: String(n) }))}
              onChange={(start) => patchSettings({ start })}
            />
          </div>
          <SwitchRow
            label={t.darts.doubleOut}
            hint={t.darts.doubleOutHint}
            checked={s.doubleOut}
            onChange={(doubleOut) => patchSettings({ doubleOut })}
          />
          <SwitchRow
            label={t.darts.doubleIn}
            hint={t.darts.doubleInHint}
            checked={s.doubleIn}
            onChange={(doubleIn) => patchSettings({ doubleIn })}
          />
        </>
      ) : (
        <p className="text-xs text-muted">{t.darts.cricketHint}</p>
      )}
    </div>
  );
}
