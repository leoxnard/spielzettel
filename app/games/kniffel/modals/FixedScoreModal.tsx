import { t } from "~/i18n/de";
import { Button } from "~/components/ui/Button";
import type { CategoryDef } from "../types";

interface FixedScoreModalProps {
  def: CategoryDef;
  onSubmit: (points: number) => void;
  onClear?: () => void;
}

/** Full House, Straßen, Kniffel: achieved (fixed points) or struck. */
export function FixedScoreModal({ def, onSubmit, onClear }: FixedScoreModalProps) {
  const points = def.fixedScore!;

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={() => onSubmit(points)}>
        <svg
          width="16"
          height="16"
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
        {t.kniffel.achieved(points)}
      </Button>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => onSubmit(0)}>
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
      {onClear && (
        <Button variant="danger" size="sm" onClick={onClear} className="w-full">
          {t.modal.clear}
        </Button>
      )}
    </div>
  );
}
