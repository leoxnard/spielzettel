import { useEffect, useRef, useState } from "react";

import { cx } from "~/lib/cx";
import { NumericKeypad } from "~/components/ui/NumericKeypad";

interface MiniStepperProps {
  /** null = not yet entered (shows "–"); the first "+" commits an explicit 0. */
  value: number | null;
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

/** Compact stepper for per-player round entries. */
export function MiniStepper({ value, onChange, min, max, label }: MiniStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const buttonClass =
    "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-base transition-colors hover:bg-field disabled:opacity-40 disabled:pointer-events-none";

  const atMax = value !== null && value >= max;
  const atMin = value === null || value <= min;

  const step = (delta: 1 | -1) => {
    if (delta === 1 && atMax) return;
    if (delta === -1 && atMin) return;
    onChange(clamp((value ?? 0) + delta));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={buttonClass}
        onClick={() => step(-1)}
        disabled={atMin}
        aria-label={`${label} −1`}
      >
        −
      </button>
      <NumericKeypad
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        label={label}
        placeholder="–"
        className={cx(
          "h-9 w-20 rounded-lg border border-border bg-field text-center font-display text-lg font-semibold placeholder:text-muted/60 focus:border-primary focus:outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <button
        type="button"
        className={buttonClass}
        onClick={() => step(1)}
        disabled={atMax}
        aria-label={`${label} +1`}
      >
        +
      </button>
    </div>
  );
}