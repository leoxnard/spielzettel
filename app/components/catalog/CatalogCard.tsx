import { Link } from "react-router";

import type { CatalogListItem } from "~/catalog/list";
import type { RatingStats } from "~/catalog/ratings";
import { Card } from "~/components/ui/Card";
import { t } from "~/i18n/de";
import { FavoriteButton } from "./FavoriteButton";
import { StarDisplay } from "./Stars";

export function DeckPills({ game }: { game: Pick<CatalogListItem, "decks" | "ownDeckName"> }) {
  return (
    <>
      {game.decks.map((deck) => (
        <span
          key={deck}
          className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
        >
          {deck === "own" && game.ownDeckName ? game.ownDeckName : t.catalog.decks[deck]}
        </span>
      ))}
    </>
  );
}

export function CatalogCard({
  game,
  rating,
  index,
}: {
  game: CatalogListItem;
  rating?: RatingStats;
  index: number;
}) {
  return (
    <Card
      className="relative flex flex-col p-5 transition-shadow hover:shadow-[0_2px_6px_rgb(0_0_0/0.05),0_16px_32px_-16px_rgb(0_0_0/0.15)] animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            <Link
              to={`/katalog/${game.slug}`}
              className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
            >
              {game.name}
            </Link>
          </h2>
          {rating && rating.count > 0 ? (
            <StarDisplay avg={rating.avg} count={rating.count} />
          ) : null}
        </div>
        <FavoriteButton slug={game.slug} className="relative z-10 -mr-2 -mt-2" />
      </div>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{game.tagline}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted">
          {t.catalog.players(game.minPlayers, game.maxPlayers)}
        </span>
        <span className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted">
          {t.catalog.duration(game.duration[0], game.duration[1])}
        </span>
        <DeckPills game={game} />
      </div>
    </Card>
  );
}
