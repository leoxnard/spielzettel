import { useState } from "react";

import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import { BULL, CRICKET_TARGETS } from "./logic";
import type { Dart, DartsMode, Multiplier } from "./types";

interface DartPadProps {
  mode: DartsMode;
  onDart: (dart: Dart) => void;
  onUndo: () => void;
  canUndo: boolean;
}

const X01_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
const CRICKET_NUMBERS = CRICKET_TARGETS.filter((n) => n !== BULL);

const keyBase =
  "flex h-12 items-center justify-center rounded-xl font-display text-lg font-semibold tabular-nums transition-[background-color,transform] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Fast phone pad: pick Double/Triple (applies to the next dart only), then
 * the segment. Triple bull doesn't exist, so Bull is disabled under Triple.
 */
export function DartPad({ mode, onDart, onUndo, canUndo }: DartPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const numbers = mode === "cricket" ? CRICKET_NUMBERS : X01_NUMBERS;

  const throwDart = (segment: number) => {
    onDart({ segment, multiplier: segment === 0 ? 1 : multiplier });
    setMultiplier(1);
  };

  const toggle = (m: Multiplier) => setMultiplier((cur) => (cur === m ? 1 : m));

  const modifier = (m: Multiplier, label: string) => (
    <button
      type="button"
      aria-pressed={multiplier === m}
      onClick={() => toggle(m)}
      className={cx(
        keyBase,
        "font-sans text-sm",
        multiplier === m
          ? "bg-primary text-primary-ink shadow-sm"
          : "bg-primary-soft text-primary",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
      <div
        className={cx(
          "grid gap-2",
          mode === "cricket" ? "grid-cols-3" : "grid-cols-5",
        )}
      >
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => throwDart(n)}
            className={cx(
              keyBase,
              multiplier === 1
                ? "bg-field text-ink hover:bg-border/60"
                : "bg-accent-soft text-ink hover:bg-accent/30",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {modifier(2, t.darts.double)}
        {modifier(3, t.darts.triple)}
        <button
          type="button"
          onClick={() => throwDart(BULL)}
          disabled={multiplier === 3}
          className={cx(
            keyBase,
            "font-sans text-sm",
            multiplier === 2
              ? "bg-accent-soft text-ink"
              : "bg-field text-ink hover:bg-border/60",
          )}
        >
          {multiplier === 2 ? t.darts.bull : t.darts.outerBull}
        </button>
        <button
          type="button"
          onClick={() => throwDart(0)}
          className={cx(keyBase, "bg-field font-sans text-sm text-muted hover:bg-border/60")}
        >
          {t.darts.miss}
        </button>
        <button
          type="button"
          onClick={() => {
            setMultiplier(1);
            onUndo();
          }}
          disabled={!canUndo}
          aria-label={t.darts.undo}
          title={t.darts.undo}
          className={cx(keyBase, "bg-field text-danger hover:bg-border/60")}
        >
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
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
