import { useEffect, useRef, useState } from "react";

import { cx } from "~/lib/cx";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
}

function parseDraft(raw: string): number | null {
  if (raw.trim() === "" || raw === "-") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function Stepper({ value, onChange, min, max, label }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const buttonClass =
    "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-lg transition-colors hover:bg-field disabled:opacity-40 disabled:pointer-events-none";

  // Local draft so backspacing to an empty field is visible while typing —
  // a controlled input bound straight to `value` snaps back to a digit on
  // every keystroke that already parses to a number.
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="−1"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        aria-label={label}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setDraft(String(value));
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const n = parseDraft(raw);
          if (n !== null) onChange(clamp(n));
        }}
        className={cx(
          "h-12 w-20 rounded-xl border border-border bg-field text-center font-display text-2xl font-semibold focus:border-primary focus:outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="+1"
      >
        +
      </button>
    </div>
  );
}
