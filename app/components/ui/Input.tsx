import type { InputHTMLAttributes } from "react";

import { cx } from "~/lib/cx";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "h-11 w-full rounded-xl bg-field px-4 text-sm text-ink placeholder:text-muted/70 border border-transparent transition-colors focus:border-primary focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
