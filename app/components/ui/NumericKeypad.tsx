import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

function isTouchDevice() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window)
  );
}

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
  const draftRef = useRef(draft);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keypadRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const touch = isTouchDevice();

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value === null ? "" : String(value));
      draftRef.current = value === null ? "" : String(value);
    }
  }, [value]);

  const setDraftBoth = (updater: string | ((prev: string) => string)) => {
    setDraft((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      draftRef.current = next;
      return next;
    });
  };

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commitDraft = () => {
    const d = draftRef.current;
    if (d === "" || d === "-") return;
    const n = Number(d);
    if (!Number.isNaN(n)) onChange(clamp(n));
  };

  const handleKey = (key: string) => {
    if (disabled) return;

    setDraftBoth((d) => {
      if (key === "⌫") return d.slice(0, -1);
      if (key === "±") {
        if (d === "" || d === "-") return "-";
        if (d.startsWith("-")) return d.slice(1);
        return "-" + d;
      }
      if (d === "0") return key;
      return d + key;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraftBoth(raw);
    if (raw === "" || raw === "-") return;
    const n = Number(raw);
    if (!Number.isNaN(n)) onChange(clamp(n));
  };

  const handleFocus = () => {
    focusedRef.current = true;
    if (touch) setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't blur if clicking inside the keypad
    if (keypadRef.current?.contains(e.relatedTarget as Node)) return;
    focusedRef.current = false;
    commitDraft();
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Escape") {
      setDraft(value === null ? "" : String(value));
    }
  };

  const closeKeypad = () => {
    commitDraft();
    setIsOpen(false);
    inputRef.current?.blur();
  };

  if (!touch) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]+"
        value={value === null ? "" : String(value)}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || raw === "-") return;
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        disabled={disabled}
        className={cx(
          "h-9 w-16 rounded-lg border border-border bg-field text-center font-display text-lg font-semibold placeholder:text-muted/60 focus:border-primary focus:outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      />
    );
  }

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
        readOnly
        disabled={disabled}
        className={cx(
          "h-9 w-16 rounded-lg border border-border bg-field text-center font-display text-lg font-semibold placeholder:text-muted/60 focus:border-primary focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      />

      {isOpen &&
        createPortal(
          <div
            ref={keypadRef}
            className="fixed inset-x-0 bottom-0 z-[9999] bg-surface border-t border-border shadow-xl animate-sheet-in"
            role="dialog"
            aria-label={label}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="mx-auto max-w-sm px-4 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted">{label}</span>
                <button
                  type="button"
                  onClick={closeKeypad}
                  className="text-sm text-primary font-medium"
                >
                  {t.rounds.keypadDone}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 pb-4">
                {KEYS.map((row, ri) =>
                  row.map((key) => (
                    <button
                      key={`${ri}-${key}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleKey(key)}
                      disabled={disabled}
                      className={cx(
                        "h-14 rounded-xl bg-field text-xl font-semibold transition-colors active:scale-95 touch-manipulation",
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
          </div>,
          document.body,
        )}
    </div>
  );
}