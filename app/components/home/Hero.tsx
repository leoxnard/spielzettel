import { t } from "~/i18n/de";

export function Hero() {
  return (
    <section className="px-4 pb-10 pt-12 text-center sm:pt-16">
      <h1 className="mx-auto max-w-xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {t.home.headline} <span className="text-primary">{t.home.headlineAccent}</span>
      </h1>
      <p className="mx-auto mt-5 max-w-md text-balance text-muted">
        {t.home.subline}
      </p>
    </section>
  );
}
