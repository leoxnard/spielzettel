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
    if (d === "" || d === "-") {
      onChange(clamp(0));
      setDraftBoth("0");
      return;
    }
    const n = Number(d);
    if (!Number.isNaN(n)) {
      onChange(clamp(n));
      setDraftBoth(String(clamp(n)));
    }
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

  // Next keypad field in document order — lets you enter a whole round
  // without closing the keypad in between.
  const [nextField, setNextField] = useState<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const fields = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[data-keypad]:not(:disabled)"),
    );
    const i = fields.indexOf(inputRef.current!);
    setNextField(i >= 0 ? fields[i + 1] ?? null : null);

    // Keep the field visible above the sheet.
    const sheet = keypadRef.current?.offsetHeight ?? 0;
    document.body.style.paddingBottom = `${sheet}px`;
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      const limit = window.innerHeight - sheet - 24;
      if (rect.bottom > limit) window.scrollBy({ top: rect.bottom - limit, behavior: "smooth" });
    }
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [isOpen]);

  const goNext = () => {
    commitDraft();
    nextField?.focus();
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
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commitDraft();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraftBoth(raw);
          if (raw === "" || raw === "-") return;
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            inputRef.current?.blur();
          }
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
        data-keypad=""
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-medium text-muted">
                    {label}
                  </span>
                  <span className="font-display text-3xl font-semibold tabular-nums">
                    {draft === "" ? placeholder : draft}
                  </span>
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={closeKeypad}
                  className="h-11 rounded-xl px-3 text-sm font-medium text-primary"
                >
                  {t.rounds.keypadDone}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 pb-2">
                {KEYS.map((row, ri) =>
                  row.map((key) => (
                    <button
                      key={`${ri}-${key}`}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handleKey(key);
                      }}
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
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={nextField ? goNext : closeKeypad}
                className="mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-ink transition-opacity active:opacity-80"
              >
                {nextField ? t.rounds.keypadNext : t.rounds.keypadDone}
                {nextField && <span aria-hidden>→</span>}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}