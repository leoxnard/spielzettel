import { useSyncExternalStore } from "react";

import type { DeckId } from "./types";

/** Tiny localStorage-backed store; one per key, shared across components. */
function createStore<T>(key: string, fallback: T) {
  let cache: T | undefined;
  let listeners: Array<() => void> = [];

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const write = (value: T) => {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or blocked — keep the in-memory value
    }
    for (const l of listeners) l();
  };

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  };

  const use = () => useSyncExternalStore(subscribe, read, () => fallback);
  return { read, write, use };
}

const favorites = createStore<string[]>("spielzettel:favorites", []);
const decks = createStore<DeckId[]>("spielzettel:decks", []);
const myRatings = createStore<Record<string, number>>("spielzettel:ratings", {});

export const useFavorites = favorites.use;
export function toggleFavorite(slug: string) {
  const current = favorites.read();
  favorites.write(
    current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
  );
}

/** "Meine Karten" — remembered so the filter is set once per device. */
export const useOwnedDecks = decks.use;
export const setOwnedDecks = decks.write;

export const useMyRatings = myRatings.use;
export function setMyRating(slug: string, stars: number | null) {
  const next = { ...myRatings.read() };
  if (stars === null) delete next[slug];
  else next[slug] = stars;
  myRatings.write(next);
}

/** Anonymous per-device id: one rating per device and game. */
export function deviceId(): string {
  const key = "spielzettel:device";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
