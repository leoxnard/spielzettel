import type { CatalogGame, CategoryId, DeckId } from "./types";

/** Decks you can build from another one (e.g. a 52 deck minus 2–6 = 32). */
const DERIVABLE: Record<DeckId, DeckId[]> = {
  romme110: ["french52", "skat32", "doko48"],
  french52: ["skat32"],
  skat32: [],
  doko48: [],
  tarock: [],
  own: [],
};

export function expandDecks(owned: readonly DeckId[]): Set<DeckId> {
  const result = new Set<DeckId>();
  const visit = (deck: DeckId) => {
    if (result.has(deck)) return;
    result.add(deck);
    DERIVABLE[deck].forEach(visit);
  };
  owned.forEach(visit);
  return result;
}

export interface CatalogFilters {
  query: string;
  /** null = any player count */
  players: number | null;
  /** empty = don't filter by material */
  decks: DeckId[];
  /** Include games that need their own commercial deck. */
  includeOwn: boolean;
  categories: CategoryId[];
  /** Max. minutes, null = any */
  maxDuration: number | null;
  favoritesOnly: boolean;
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  players: null,
  decks: [],
  includeOwn: true,
  categories: [],
  maxDuration: null,
  favoritesOnly: false,
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss");
}

type Filterable = Pick<
  CatalogGame,
  "slug" | "name" | "aka" | "minPlayers" | "maxPlayers" | "decks" | "categories" | "duration"
> & { ownDeckName?: string };

export function matchesFilters(
  game: Filterable,
  filters: CatalogFilters,
  favorites: ReadonlySet<string>,
): boolean {
  if (filters.favoritesOnly && !favorites.has(game.slug)) return false;
  if (
    filters.players !== null &&
    (filters.players < game.minPlayers || filters.players > game.maxPlayers)
  ) {
    return false;
  }
  const needsOwn = game.decks.every((d) => d === "own");
  if (needsOwn && !filters.includeOwn) return false;
  if (filters.decks.length > 0 && !needsOwn) {
    const owned = expandDecks(filters.decks);
    if (!game.decks.some((d) => owned.has(d))) return false;
  }
  if (
    filters.categories.length > 0 &&
    !filters.categories.some((c) => game.categories.includes(c))
  ) {
    return false;
  }
  if (filters.maxDuration !== null && game.duration[0] > filters.maxDuration) {
    return false;
  }
  const q = normalize(filters.query.trim());
  if (q) {
    const haystack = normalize(
      [game.name, ...(game.aka ?? []), game.ownDeckName ?? ""].join(" "),
    );
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function activeFilterCount(filters: CatalogFilters): number {
  return (
    (filters.players !== null ? 1 : 0) +
    (filters.decks.length > 0 ? 1 : 0) +
    (filters.includeOwn ? 0 : 1) +
    filters.categories.length +
    (filters.maxDuration !== null ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0)
  );
}
