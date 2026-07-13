import type { HTMLAttributes } from "react";

import { cx } from "~/lib/cx";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-border/60 bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.1)]",
        className,
      )}
      {...props}
    />
  );
}
