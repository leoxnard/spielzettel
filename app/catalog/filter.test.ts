import { describe, expect, it } from "vitest";

import { EMPTY_FILTERS, expandDecks, matchesFilters } from "./filter";
import type { CatalogGame } from "./types";

const game = (over: Partial<CatalogGame>): CatalogGame => ({
  slug: "x",
  name: "Mau-Mau",
  tagline: "",
  minPlayers: 2,
  maxPlayers: 5,
  duration: [10, 20],
  minAge: 6,
  complexity: 1,
  decks: ["skat32", "french52"],
  categories: ["ablege"],
  goal: "",
  setup: [],
  rules: [],
  scoring: [],
  links: [],
  ...over,
});

const none = new Set<string>();

describe("expandDecks", () => {
  it("derives smaller decks", () => {
    expect([...expandDecks(["romme110"])].sort()).toEqual(
      ["doko48", "french52", "romme110", "skat32"],
    );
    expect(expandDecks(["skat32"]).has("french52")).toBe(false);
  });
});

describe("matchesFilters", () => {
  it("filters by player count", () => {
    expect(matchesFilters(game({}), { ...EMPTY_FILTERS, players: 5 }, none)).toBe(true);
    expect(matchesFilters(game({}), { ...EMPTY_FILTERS, players: 6 }, none)).toBe(false);
  });

  it("accepts games playable with a derived deck", () => {
    const skat = game({ decks: ["skat32"] });
    expect(matchesFilters(skat, { ...EMPTY_FILTERS, decks: ["french52"] }, none)).toBe(true);
    const doko = game({ decks: ["doko48"] });
    expect(matchesFilters(doko, { ...EMPTY_FILTERS, decks: ["french52"] }, none)).toBe(false);
  });

  it("keeps own-deck games unless excluded or a deck is chosen", () => {
    const uno = game({ decks: ["own"], ownDeckName: "Uno" });
    expect(matchesFilters(uno, EMPTY_FILTERS, none)).toBe(true);
    expect(matchesFilters(uno, { ...EMPTY_FILTERS, decks: ["skat32"] }, none)).toBe(false);
    expect(matchesFilters(uno, { ...EMPTY_FILTERS, includeOwn: false }, none)).toBe(false);
  });

  it("searches names without accents", () => {
    const g = game({ name: "Rommé", aka: ["Rummy"] });
    expect(matchesFilters(g, { ...EMPTY_FILTERS, query: "romme" }, none)).toBe(true);
    expect(matchesFilters(g, { ...EMPTY_FILTERS, query: "rummy" }, none)).toBe(true);
    expect(matchesFilters(g, { ...EMPTY_FILTERS, query: "skat" }, none)).toBe(false);
  });

  it("filters favorites and categories", () => {
    const g = game({ slug: "a" });
    expect(matchesFilters(g, { ...EMPTY_FILTERS, favoritesOnly: true }, none)).toBe(false);
    expect(matchesFilters(g, { ...EMPTY_FILTERS, favoritesOnly: true }, new Set(["a"]))).toBe(true);
    expect(matchesFilters(g, { ...EMPTY_FILTERS, categories: ["stich"] }, none)).toBe(false);
  });
});
