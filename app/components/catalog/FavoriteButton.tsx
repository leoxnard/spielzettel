import { toggleFavorite, useFavorites } from "~/catalog/favorites";
import { t } from "~/i18n/de";
import { cx } from "~/lib/cx";

export function FavoriteButton({ slug, className }: { slug: string; className?: string }) {
  const favorites = useFavorites();
  const active = favorites.includes(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(slug);
      }}
      aria-pressed={active}
      aria-label={active ? t.catalog.unfavorite : t.catalog.favorite}
      title={active ? t.catalog.unfavorite : t.catalog.favorite}
      className={cx(
        "flex size-11 shrink-0 items-center justify-center rounded-xl transition-[color,transform] active:scale-90",
        active ? "text-danger" : "text-muted hover:text-ink",
        className,
      )}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
      </svg>
    </button>
  );
}
