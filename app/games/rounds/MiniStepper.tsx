import { cx } from "~/lib/cx";

interface MiniStepperProps {
  /** null = not yet entered (shows "–"); the first "+" commits an explicit 0. */
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
}

/** Compact stepper for per-player round entries. */
export function MiniStepper({ value, onChange, min, max, label }: MiniStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const buttonClass =
    "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-base transition-colors hover:bg-field disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp((value ?? min) - 1))}
        disabled={value === null || value <= min}
        aria-label={`${label} −1`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        placeholder="–"
        min={min}
        max={max}
        aria-label={label}
        onChange={(e) => {
          if (e.target.value === "") return;
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        className={cx(
          "h-9 w-14 rounded-lg border border-border bg-field text-center font-display text-lg font-semibold placeholder:text-muted/60 focus:border-primary focus:outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value === null ? clamp(0) : clamp(value + 1))}
        disabled={value !== null && value >= max}
        aria-label={`${label} +1`}
      >
        +
      </button>
    </div>
  );
}
