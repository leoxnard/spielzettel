import { t } from "~/i18n/de";

export function Hero() {
  return (
    <section className="px-4 pb-10 pt-12 text-center sm:pt-16">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-sm">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-accent"
          aria-hidden
        >
          <path d="M12 2l1.9 5.8L20 9.7l-5 3.9 1.7 6.1L12 16l-4.7 3.7L9 13.6 4 9.7l6.1-1.9z" />
        </svg>
        {t.home.eyebrow}
      </span>
      <h1 className="mx-auto mt-5 max-w-xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {t.home.headline}{" "}
        <span className="relative whitespace-nowrap text-primary">
          {t.home.headlineAccent}
          <svg
            viewBox="0 0 200 9"
            className="absolute -bottom-1.5 left-0 w-full text-accent"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M2 7c40-4 120-6 196-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-md text-balance text-muted">
        {t.home.subline}
      </p>
    </section>
  );
}
