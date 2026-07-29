import { useSyncExternalStore } from "react";

import type { GameStatus } from "./types";

export interface RecentGame {
  id: string;
  code: string;
  gameType: string;
  title: string | null;
  status: GameStatus;
  playerCount: number;
  visitedAt: number;
  /** Set when the game belongs to a group; drives the group label + color. */
  groupId: string | null;
  groupName: string | null;
  /** Winner names when the game is finished. */
  winners?: string[];
}

const STORAGE_KEY = "spielzettel:recent";
const MAX_ENTRIES = 5;

let cache: RecentGame[] | null = null;
let listeners: Array<() => void> = [];

function read(): RecentGame[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as RecentGame[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function notify() {
  cache = null;
  for (const l of listeners) l();
}

/** Called on every game-page visit; keeps the newest entry per game. */
export function recordRecentGame(entry: RecentGame) {
  const rest = read().filter((g) => g.id !== entry.id);
  const next = [entry, ...rest].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notify();
}

export function removeRecentGame(id: string) {
  const next = read().filter((g) => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notify();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: RecentGame[] = [];

/** Server snapshot is empty — the list renders client-side only. */
export function useRecentGames(): RecentGame[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
