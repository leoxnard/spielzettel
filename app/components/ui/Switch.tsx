import { cx } from "~/lib/cx";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        checked ? "bg-primary" : "bg-field",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
