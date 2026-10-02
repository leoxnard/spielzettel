import { useMemo, useState } from "react";
import { Link } from "react-router";

import type { Route } from "./+types/catalog";
import { useFavorites, useOwnedDecks, setOwnedDecks } from "~/catalog/favorites";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  matchesFilters,
  type CatalogFilters,
} from "~/catalog/filter";
import { CATALOG } from "~/catalog/games";
import { toListItem, type CatalogListItem } from "~/catalog/list";
import { fetchRatings, type RatingMap } from "~/catalog/ratings";
import { CatalogCard, DeckPills } from "~/components/catalog/CatalogCard";
import { CatalogFilterPanel } from "~/components/catalog/CatalogFilterPanel";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { Input } from "~/components/ui/Input";
import { Modal } from "~/components/ui/Modal";
import { t } from "~/i18n/de";
import { secureRandomIndex } from "~/lib/random";
import { pageMeta } from "~/lib/seo";

export async function loader() {
  const ratings = await fetchRatings().catch(() => null);
  return { games: CATALOG.map(toListItem), ratings };
}

export function meta({}: Route.MetaArgs) {
  return pageMeta({
    title: `${t.catalog.metaTitle} · ${t.app.name}`,
    description: t.catalog.subline,
    path: "/katalog",
  });
}

type Sort = "name" | "rating" | "quick";

function sortGames(
  games: CatalogListItem[],
  sort: Sort,
  ratings: RatingMap | null,
  favorites: ReadonlySet<string>,
) {
  const score = (g: CatalogListItem) => ratings?.[g.slug]?.avg ?? 0;
  return [...games].sort((a, b) => {
    const fav = Number(favorites.has(b.slug)) - Number(favorites.has(a.slug));
    if (fav !== 0) return fav;
    if (sort === "rating" && score(b) !== score(a)) return score(b) - score(a);
    if (sort === "quick" && a.duration[0] !== b.duration[0]) {
      return a.duration[0] - b.duration[0];
    }
    return a.name.localeCompare(b.name, "de", { numeric: true });
  });
}

export default function Catalog({ loaderData }: Route.ComponentProps) {
  const { games, ratings } = loaderData;
  const favoriteList = useFavorites();
  const favorites = useMemo(() => new Set(favoriteList), [favoriteList]);
  const decks = useOwnedDecks();
  const [local, setLocal] = useState<Omit<CatalogFilters, "decks">>(EMPTY_FILTERS);
  const [showMore, setShowMore] = useState(false);
  const [sort, setSort] = useState<Sort>("name");
  const [pick, setPick] = useState<CatalogListItem | null>(null);

  const filters: CatalogFilters = { ...local, decks };
  const onChange = (patch: Partial<CatalogFilters>) => {
    const { decks: nextDecks, ...rest } = patch;
    if (nextDecks) setOwnedDecks(nextDecks);
    setLocal((prev) => ({ ...prev, ...rest }));
  };

  const results = useMemo(
    () =>
      sortGames(
        games.filter((g) => matchesFilters(g, filters, favorites)),
        sort,
        ratings,
        favorites,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [games, local, decks, favorites, sort, ratings],
  );

  const extraFilters =
    activeFilterCount(filters) -
    (filters.players !== null ? 1 : 0) -
    (filters.decks.length > 0 ? 1 : 0) -
    (filters.favoritesOnly ? 1 : 0);

  const drawRandom = () => {
    if (results.length === 0) return;
    const others = results.length > 1 ? results.filter((g) => g !== pick) : results;
    setPick(others[secureRandomIndex(others.length)]);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 animate-fade-in-up">
      <section className="pb-6 pt-10 text-center sm:pt-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {t.catalog.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-muted">{t.catalog.subline}</p>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex gap-2">
          <Input
            type="search"
            value={local.query}
            placeholder={t.catalog.searchPlaceholder}
            onChange={(e) => onChange({ query: e.target.value })}
            aria-label={t.catalog.searchPlaceholder}
          />
          <Button
            variant="secondary"
            onClick={drawRandom}
            disabled={results.length === 0}
            title={t.catalog.randomHint}
            className="shrink-0"
          >
            <DiceIcon />
            <span className="hidden sm:inline">{t.catalog.random}</span>
          </Button>
        </div>
        <CatalogFilterPanel filters={filters} onChange={onChange} showMore={showMore} />
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Chip
            active={filters.favoritesOnly}
            onClick={() => onChange({ favoritesOnly: !filters.favoritesOnly })}
          >
            <span aria-hidden>♥</span> {t.catalog.favoritesOnly}
          </Chip>
          <Chip active={showMore} onClick={() => setShowMore((v) => !v)}>
            {t.catalog.filters}
            {extraFilters > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-xs text-accent-ink">
                {extraFilters}
              </span>
            )}
          </Chip>
          {activeFilterCount(filters) > 0 || local.query ? (
            <button
              type="button"
              onClick={() => {
                setLocal(EMPTY_FILTERS);
                setOwnedDecks([]);
              }}
              className="h-10 px-2 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {t.catalog.resetFilters}
            </button>
          ) : null}
        </div>
      </Card>

      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <span className="text-sm font-medium" aria-live="polite">
          {t.catalog.results(results.length)}
        </span>
        <label className="flex items-center gap-2 text-sm text-muted">
          {t.catalog.sortLabel}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
          >
            <option value="name">{t.catalog.sortName}</option>
            {ratings && <option value="rating">{t.catalog.sortRating}</option>}
            <option value="quick">{t.catalog.sortQuick}</option>
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
          {t.catalog.empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((game, i) => (
            <CatalogCard key={game.slug} game={game} rating={ratings?.[game.slug]} index={i} />
          ))}
        </div>
      )}

      <Modal
        open={pick !== null}
        onClose={() => setPick(null)}
        title={pick?.name ?? ""}
        subtitle={pick?.tagline}
      >
        {pick && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted">
                {t.catalog.players(pick.minPlayers, pick.maxPlayers)}
              </span>
              <span className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted">
                {t.catalog.duration(pick.duration[0], pick.duration[1])}
              </span>
              <DeckPills game={pick} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={drawRandom}>
                <DiceIcon />
                {t.catalog.random}
              </Button>
              <Link
                to={`/katalog/${pick.slug}`}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-ink shadow-sm transition-opacity hover:opacity-90"
              >
                {t.catalog.openRules}
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}

function DiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
