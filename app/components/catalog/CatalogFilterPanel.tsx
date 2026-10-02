import { activeFilterCount, type CatalogFilters } from "~/catalog/filter";
import type { CategoryId, DeckId } from "~/catalog/types";
import { Chip } from "~/components/ui/Chip";
import { Switch } from "~/components/ui/Switch";
import { t } from "~/i18n/de";

const PLAYER_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8];
const DECKS: DeckId[] = ["french52", "skat32", "doko48", "romme110"];
const CATEGORIES = Object.keys(t.catalog.categories) as CategoryId[];
const DURATIONS = [15, 30, 60];

const label = "mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Horizontal scroll row on phones, wrapping on wider screens. */
function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {children}
    </div>
  );
}

export function CatalogFilterPanel({
  filters,
  onChange,
  showMore,
}: {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  showMore: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <span className={label}>{t.catalog.playersLabel}</span>
        <ChipRow>
          <Chip active={filters.players === null} onClick={() => onChange({ players: null })}>
            {t.catalog.anyPlayers}
          </Chip>
          {PLAYER_CHOICES.map((n) => (
            <Chip
              key={n}
              active={filters.players === n}
              onClick={() => onChange({ players: filters.players === n ? null : n })}
              className="min-w-10 justify-center font-display"
            >
              {n === 8 ? "8+" : n}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div>
        <span className={label}>{t.catalog.decksLabel}</span>
        <ChipRow>
          {DECKS.map((deck) => (
            <Chip
              key={deck}
              active={filters.decks.includes(deck)}
              onClick={() => onChange({ decks: toggle(filters.decks, deck) })}
            >
              {t.catalog.decks[deck]}
              <span className="text-xs opacity-70">{t.catalog.deckHints[deck]}</span>
            </Chip>
          ))}
        </ChipRow>
        <p className="mt-1.5 text-xs text-muted">{t.catalog.decksHint}</p>
      </div>

      {showMore && (
        <>
          <div>
            <span className={label}>{t.catalog.categoriesLabel}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  active={filters.categories.includes(c)}
                  onClick={() => onChange({ categories: toggle(filters.categories, c) })}
                >
                  {t.catalog.categories[c]}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>{t.catalog.durationLabel}</span>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={filters.maxDuration === null}
                onClick={() => onChange({ maxDuration: null })}
              >
                {t.catalog.anyDuration}
              </Chip>
              {DURATIONS.map((n) => (
                <Chip
                  key={n}
                  active={filters.maxDuration === n}
                  onClick={() => onChange({ maxDuration: n })}
                >
                  {t.catalog.upToMinutes(n)}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">{t.catalog.includeOwn}</span>
            <Switch
              checked={filters.includeOwn}
              onChange={(includeOwn) => onChange({ includeOwn })}
              label={t.catalog.includeOwn}
            />
          </div>
        </>
      )}
    </div>
  );
}

export { activeFilterCount };
