import { Button } from "~/components/ui/Button";
import { t } from "~/i18n/de";

interface ModalFooterProps {
  onStrike: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
  /** Shown only when the cell already holds a value. */
  onClear?: () => void;
}

export function ModalFooter({
  onStrike,
  onSubmit,
  submitLabel,
  submitDisabled,
  onClear,
}: ModalFooterProps) {
  return (
    <div className="mt-6 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onStrike}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M5.6 5.6l12.8 12.8" />
          </svg>
          {t.modal.strike}
        </Button>
        <Button onClick={onSubmit} disabled={submitDisabled}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {submitLabel}
        </Button>
      </div>
      {onClear && (
        <Button variant="danger" size="sm" onClick={onClear} className="w-full">
          {t.modal.clear}
        </Button>
      )}
    </div>
  );
}
