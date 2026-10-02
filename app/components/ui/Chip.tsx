import type { ButtonHTMLAttributes } from "react";

import { cx } from "~/lib/cx";

/** Toggle pill for filters and choices. */
export function Chip({
  active,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-ink"
          : "border-border bg-surface text-ink hover:bg-field",
        className,
      )}
      {...props}
    />
  );
}
