import { data, isRouteErrorResponse, Link } from "react-router";

import type { Route } from "./+types/catalog-game";
import { CATALOG } from "~/catalog/games";
import { fetchRatings } from "~/catalog/ratings";
import type { CatalogLink } from "~/catalog/types";
import { DeckPills } from "~/components/catalog/CatalogCard";
import { FavoriteButton } from "~/components/catalog/FavoriteButton";
import { RatingPanel } from "~/components/catalog/RatingPanel";
import { StartSheetButton } from "~/components/catalog/StartSheetButton";
import { Card } from "~/components/ui/Card";
import { t } from "~/i18n/de";
import { pageMeta } from "~/lib/seo";

export async function loader({ params }: Route.LoaderArgs) {
  const game = CATALOG.find((g) => g.slug === params.slug);
  if (!game) throw data(null, { status: 404 });
  const ratings = await fetchRatings().catch(() => null);
  return {
    game,
    rating: ratings ? (ratings[game.slug] ?? { avg: 0, count: 0 }) : null,
  };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  const path = `/katalog/${params.slug}`;
  if (!loaderData) {
    return pageMeta({ title: t.catalog.title, description: t.catalog.subline, path, noindex: true });
  }
  const { game } = loaderData;
  return pageMeta({
    title: `${game.name} – Regeln & Anleitung · ${t.app.name}`,
    description: `${game.tagline} ${game.goal}`,
    path,
  });
}

const sectionLabel = "mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary";

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className={sectionLabel}>{title}</h2>
      <ul className="space-y-2 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LINK_ICON: Record<CatalogLink["kind"], string> = {
  rules: "📖",
  video: "▶",
  wiki: "W",
  bgg: "★",
};

export default function CatalogGame({ loaderData }: Route.ComponentProps) {
  const { game, rating } = loaderData;
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 animate-fade-in-up">
      <Link
        to="/katalog"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        {t.catalog.backToCatalog}
      </Link>

      <header className="mb-6 mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{game.name}</h1>
          {game.aka && game.aka.length > 0 && (
            <p className="mt-1 text-sm text-muted">{game.aka.join(" · ")}</p>
          )}
          <p className="mt-3 text-balance text-lg">{game.tagline}</p>
        </div>
        <FavoriteButton slug={game.slug} />
      </header>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {[
          t.catalog.players(game.minPlayers, game.maxPlayers),
          t.catalog.duration(game.duration[0], game.duration[1]),
          t.catalog.age(game.minAge),
          t.catalog.complexity[game.complexity],
          ...game.categories.map((c) => t.catalog.categories[c]),
        ].map((label) => (
          <span key={label} className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted">
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-5">
        {game.sheet && (
          <Card className="p-5 sm:p-6">
            <p className="mb-3 text-sm text-muted">{t.catalog.startSheetHint}</p>
            <StartSheetButton sheet={game.sheet} />
          </Card>
        )}

        <Card className="space-y-6 p-5 sm:p-6">
          <section>
            <h2 className={sectionLabel}>{t.catalog.needs}</h2>
            <div className="flex flex-wrap gap-1.5">
              <DeckPills game={game} />
              {game.bestPlayers && game.bestPlayers.length > 0 && (
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium">
                  {t.catalog.bestWith(game.bestPlayers.join(", "))}
                </span>
              )}
            </div>
          </section>
          <section>
            <h2 className={sectionLabel}>{t.catalog.goal}</h2>
            <p className="text-sm leading-relaxed">{game.goal}</p>
          </section>
          <Section title={t.catalog.setup} items={game.setup} />
          <Section title={t.catalog.rules} items={game.rules} />
          <Section title={t.catalog.scoring} items={game.scoring} />
          <Section title={t.catalog.tips} items={game.tips ?? []} />
        </Card>

        {rating && (
          <Card className="p-5 sm:p-6">
            <RatingPanel slug={game.slug} initial={rating} />
          </Card>
        )}

        {game.links.length > 0 && (
          <Card className="p-5 sm:p-6">
            <h2 className={sectionLabel}>{t.catalog.links}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {game.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-3 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-field"
                  >
                    <span className="flex size-6 items-center justify-center rounded-lg bg-primary-soft text-xs text-primary" aria-hidden>
                      {LINK_ICON[link.kind]}
                    </span>
                    {link.label}
                    <span className="ml-auto text-muted" aria-hidden>↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-5xl font-semibold">{notFound ? "404" : t.error.title}</h1>
      <p className="text-muted">{notFound ? t.error.notFound : t.error.generic}</p>
      <Link
        to="/katalog"
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90"
      >
        {t.catalog.backToCatalog}
      </Link>
    </main>
  );
}
