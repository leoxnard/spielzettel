import type { HTMLAttributes } from "react";

import { cx } from "~/lib/cx";

type Variant = "neutral" | "primary" | "accent" | "live";

const variants: Record<Variant, string> = {
  neutral: "bg-field text-muted",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-ink",
  live: "bg-primary-soft text-primary",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {variant === "live" && (
        <span className="size-1.5 rounded-full bg-current animate-live-pulse" />
      )}
      {children}
    </span>
  );
}
