import { useState } from "react";

import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { CategoryDef } from "../types";
import { ModalFooter } from "./ModalFooter";

interface UpperSectionModalProps {
  def: CategoryDef;
  /** Existing points in the cell, if any. */
  current?: number;
  onSubmit: (points: number) => void;
  onClear?: () => void;
}

/** "Wie viele Würfel zeigen die N?" — pick a count, see the points. */
export function UpperSectionModal({
  def,
  current,
  onSubmit,
  onClear,
}: UpperSectionModalProps) {
  const face = def.face!;
  const [count, setCount] = useState<number | null>(
    current !== undefined ? current / face : null,
  );

  return (
    <div>
      <p className="mb-3 text-sm font-medium">
        {t.kniffel.howManyPrefix} <strong className="font-semibold">{face}</strong>?
      </p>
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            aria-pressed={count === n}
            className={cx(
              "flex flex-col items-center rounded-xl border py-2.5 transition-colors",
              count === n
                ? "border-primary bg-primary-soft"
                : "border-border bg-surface hover:bg-field",
            )}
          >
            <span className="font-display text-lg font-semibold">{n}</span>
            <span className="text-[11px] text-muted">
              {n * face} {t.modal.points}
            </span>
          </button>
        ))}
      </div>
      <ModalFooter
        onStrike={() => onSubmit(0)}
        onSubmit={() => count !== null && onSubmit(count * face)}
        submitLabel={
          count !== null ? t.modal.enterValue(count * face) : t.modal.enter
        }
        submitDisabled={count === null}
        onClear={onClear}
      />
    </div>
  );
}
