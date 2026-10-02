import type { CatalogGame } from "./types";

/** What the overview needs — the full rules text stays on the detail page. */
export type CatalogListItem = Pick<
  CatalogGame,
  | "slug"
  | "name"
  | "aka"
  | "tagline"
  | "minPlayers"
  | "maxPlayers"
  | "bestPlayers"
  | "duration"
  | "minAge"
  | "complexity"
  | "decks"
  | "ownDeckName"
  | "categories"
  | "sheet"
>;

export function toListItem(game: CatalogGame): CatalogListItem {
  return {
    slug: game.slug,
    name: game.name,
    aka: game.aka,
    tagline: game.tagline,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    bestPlayers: game.bestPlayers,
    duration: game.duration,
    minAge: game.minAge,
    complexity: game.complexity,
    decks: game.decks,
    ownDeckName: game.ownDeckName,
    categories: game.categories,
    sheet: game.sheet,
  };
}
