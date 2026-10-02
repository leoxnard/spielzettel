import { t } from "~/i18n/de";
import { cx } from "~/lib/cx";

function StarIcon({ fill, className }: { fill: number; className?: string }) {
  const id = `star-${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="currentColor" />
          <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"
      />
    </svg>
  );
}

/** Read-only average, e.g. ★★★★☆ 4.2 (12). */
export function StarDisplay({
  avg,
  count,
  size = "sm",
}: {
  avg: number;
  count: number;
  size?: "sm" | "md";
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-accent"
      aria-label={`${avg.toFixed(1)} / 5 · ${t.catalog.ratingCount(count)}`}
    >
      <span className="inline-flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon
            key={i}
            fill={Math.max(0, Math.min(1, avg - i))}
            className={size === "sm" ? "size-3.5" : "size-5"}
          />
        ))}
      </span>
      <span className={cx("font-semibold text-ink tabular-nums", size === "sm" ? "text-xs" : "text-sm")}>
        {avg.toFixed(1)}
      </span>
      <span className={cx("text-muted", size === "sm" ? "text-xs" : "text-sm")}>({count})</span>
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (stars: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex text-accent" role="radiogroup" aria-label={t.catalog.yourRating}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t.catalog.rateStar(n)}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="flex size-11 items-center justify-center rounded-xl transition-transform active:scale-90 disabled:opacity-50"
        >
          <StarIcon fill={value !== null && n <= value ? 1 : 0} className="size-8" />
        </button>
      ))}
    </span>
  );
}
