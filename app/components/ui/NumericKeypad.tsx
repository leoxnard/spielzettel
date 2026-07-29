import { useEffect, useRef, useState } from "react";

import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";

interface NumericKeypadProps {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["±", "0", "⌫"],
] as const;

export function NumericKeypad({
  value,
  onChange,
  min,
  max,
  label,
  disabled,
  placeholder = "–",
  className,
}: NumericKeypadProps) {
  const [draft, setDraft] = useState<string>(value === null ? "" : String(value));
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value === null ? "" : String(value));
    }
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commitDraft = () => {
    if (draft === "" || draft === "-") {
      return;
    }
    const n = Number(draft);
    if (!Number.isNaN(n)) {
      onChange(clamp(n));
    }
  };

  const handleKey = (key: string) => {
    if (disabled) return;

    if (key === "⌫") {
      setDraft((d) => d.slice(0, -1));
      return;
    }

    if (key === "±") {
      setDraft((d) => {
        if (d === "" || d === "-") return "-";
        if (d.startsWith("-")) return d.slice(1);
        return "-" + d;
      });
      return;
    }

    if (draft === "0") {
      setDraft(key);
    } else {
      setDraft((d) => d + key);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);
    if (raw === "" || raw === "-") {
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      onChange(clamp(n));
    }
  };

  const handleBlur = () => {
    focusedRef.current = false;
    commitDraft();
    setIsOpen(false);
  };

  const handleFocus = () => {
    focusedRef.current = true;
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setDraft(value === null ? "" : String(value));
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative inline-flex">
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        readOnly={isOpen}
        disabled={disabled}
        className={cx(
          "h-9 w-16 rounded-lg border border-border bg-field text-center font-display text-lg font-semibold placeholder:text-muted/60 focus:border-primary focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      />

      {isOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border shadow-xl p-4 pb-[env(safe-area-inset-bottom)] animate-sheet-in"
          role="dialog"
          aria-label={label}
        >
          <div className="mx-auto max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted">{label}</span>
              <button
                type="button"
                onClick={() => {
                  commitDraft();
                  setIsOpen(false);
                }}
                className="text-sm text-primary font-medium"
              >
                {t.rounds.keypadDone}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((row) =>
                row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKey(key)}
                    disabled={disabled}
                    className={cx(
                      "h-12 rounded-xl bg-field text-base font-semibold transition-colors active:scale-95",
                      "border border-border",
                      key === "⌫" && "text-muted",
                      key === "±" && "text-muted",
                    )}
                  >
                    {key}
                  </button>
                )),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}