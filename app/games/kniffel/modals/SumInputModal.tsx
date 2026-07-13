import { useState } from "react";

import { Stepper } from "~/components/ui/Stepper";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import { DiceFace, type DieValue } from "../DiceFace";
import type { CategoryDef } from "../types";
import { ModalFooter } from "./ModalFooter";

interface SumInputModalProps {
  def: CategoryDef;
  current?: number;
  onSubmit: (points: number) => void;
  onClear?: () => void;
  mode: "dice" | "direct";
  onModeChange: (mode: "dice" | "direct") => void;
}

/**
 * Sum of all five dice — entered directly with a stepper, or by tapping
 * the dice like a calculator (6 6 5 5 5 → 27). The dice/direct choice is
 * owned by the board so it carries over to the next cell instead of
 * resetting to "dice" every time.
 */
export function SumInputModal({
  def,
  current,
  onSubmit,
  onClear,
  mode,
  onModeChange,
}: SumInputModalProps) {
  const max = def.max ?? 30;
  const [value, setValue] = useState(current ?? 0);
  const [dice, setDice] = useState<DieValue[]>([]);

  const diceSum = dice.reduce<number>((a, b) => a + b, 0);
  const sum = mode === "dice" ? diceSum : value;

  const segment = (m: "dice" | "direct", label: string) => (
    <button
      type="button"
      onClick={() => onModeChange(m)}
      aria-pressed={mode === m}
      className={cx(
        "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        mode === m ? "bg-surface text-ink shadow-sm" : "text-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-field p-1">
        {segment("dice", t.kniffel.diceCalculator)}
        {segment("direct", t.kniffel.directInput)}
      </div>

      {mode === "dice" ? (
        <div>
          <div className="mb-3 flex h-14 items-center justify-center gap-2 rounded-xl bg-field px-3">
            {dice.length === 0 ? (
              <span className="text-sm text-muted">{t.kniffel.sumOfDice(max)}</span>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-ink">
                  {dice.map((d, i) => (
                    <DiceFace key={i} value={d} size={26} />
                  ))}
                </div>
                <span className="ml-1 font-display text-2xl font-semibold">
                  = {diceSum}
                </span>
              </>
            )}
          </div>
          <div className="grid grid-cols-6 gap-2">
            {([1, 2, 3, 4, 5, 6] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() =>
                  setDice((prev) => (prev.length < 5 ? [...prev, d] : prev))
                }
                disabled={dice.length >= 5}
                aria-label={`Würfel ${d}`}
                className="flex items-center justify-center rounded-xl border border-border bg-surface py-2.5 text-ink transition-colors hover:bg-field disabled:opacity-40"
              >
                <DiceFace value={d} size={26} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDice((prev) => prev.slice(0, -1))}
            disabled={dice.length === 0}
            className="mt-2 w-full rounded-xl py-2 text-sm text-muted transition-colors hover:bg-field disabled:opacity-40"
          >
            ⌫ Letzten Würfel entfernen
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-center text-sm font-medium">
            {t.kniffel.sumOfDice(max)}
          </p>
          <Stepper
            value={value}
            onChange={setValue}
            min={0}
            max={max}
            label={t.kniffel.sumOfDice(max)}
          />
        </div>
      )}

      <ModalFooter
        onStrike={() => onSubmit(0)}
        onSubmit={() => onSubmit(Math.min(sum, max))}
        submitLabel={t.modal.enterValue(Math.min(sum, max))}
        submitDisabled={mode === "dice" && dice.length === 0}
        onClear={onClear}
      />
    </div>
  );
}
