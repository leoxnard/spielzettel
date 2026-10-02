/** Physical card material a catalog game can be played with. */
export type DeckId =
  | "french52" // Französisches Blatt, 52 Karten (Poker/Bridge)
  | "skat32" // 32er Blatt (Skat, Schafkopf; französisch oder deutsch)
  | "doko48" // Doppelkopf-Blatt, 2 × 24 Karten (9–Ass)
  | "romme110" // Rommé/Canasta-Blatt, 2 × 52 + Joker
  | "tarock" // Tarock-/Tarot-Blatt
  | "own"; // eigenes Spielmaterial (Uno, Skyjo, Wizard …)

export type CategoryId =
  | "stich" // Stichspiel
  | "ablege" // Ablegespiel (Mau-Mau, Uno …)
  | "sammel" // Kombinations-/Sammelspiel (Rommé, Canasta …)
  | "reaktion" // Reaktion & Tempo
  | "koop" // kooperativ
  | "bluff" // Bluff & Pokern
  | "partner" // Partnerspiel (feste/wechselnde Teams)
  | "familie" // familien-/kinderfreundlich
  | "solo" // Patience / allein
  | "party"; // Partyspiel / große Runde

export interface CatalogLink {
  kind: "rules" | "video" | "wiki" | "bgg";
  label: string;
  url: string;
}

export interface CatalogGame {
  /** URL slug, kebab-case ascii: /katalog/<slug> */
  slug: string;
  name: string;
  /** Other names, used by search. */
  aka?: string[];
  /** One short sentence for the card. */
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  /** Player counts where the game shines. */
  bestPlayers?: number[];
  /** Typical duration of one game in minutes. */
  duration: [number, number];
  minAge: number;
  /** 1 = sofort erklärt, 2 = etwas Übung, 3 = anspruchsvoll */
  complexity: 1 | 2 | 3;
  /** Any of these decks works. */
  decks: DeckId[];
  /** Product name when `decks` includes "own", e.g. "Skyjo". */
  ownDeckName?: string;
  categories: CategoryId[];
  /** Ziel des Spiels — 1–2 sentences. */
  goal: string;
  /** Vorbereitung — short bullet points. */
  setup: string[];
  /** Ablauf — short bullet points, in playing order. */
  rules: string[];
  /** Wertung / Spielende — short bullet points. */
  scoring: string[];
  tips?: string[];
  links: CatalogLink[];
  /** Score sheet in this app: game slug and optional punkte preset id. */
  sheet?: { game: string; preset?: string };
}
