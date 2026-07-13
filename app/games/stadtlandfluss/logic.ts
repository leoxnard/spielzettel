import { secureRandomIndex } from "~/lib/random";
import type { BaseSettings } from "../types";

export interface SlfSettings extends BaseSettings {
  categories: string[];
  /** Letters the host removed from the draw pool in the lobby. */
  excludedLetters: string[];
}

export type SlfRoundStatus = "writing" | "scoring" | "done";

export interface SlfRound {
  letter: string;
  status: SlfRoundStatus;
  /** playerId → category → word */
  answers: Record<string, Record<string, string>>;
  /** Flat "playerId:category" → points, so concurrent scoring merges safely. */
  points: Record<string, number>;
  [key: string]: unknown;
}

export interface SlfState {
  settings: SlfSettings;
  rounds: Record<string, SlfRound>;
  currentRound: number;
}

/** German alphabet without the near-impossible letters. */
export const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split("");

/**
 * Picks a letter avoiding both letters already drawn this game and any
 * letters the host excluded. Falls back to ignoring "used" first, then
 * "excluded" as a last resort, so the pool is never truly empty.
 */
export function chooseLetter(used: string[], excluded: string[]): string {
  const fresh = LETTERS.filter((l) => !used.includes(l) && !excluded.includes(l));
  if (fresh.length > 0) return fresh[secureRandomIndex(fresh.length)];
  const allowed = LETTERS.filter((l) => !excluded.includes(l));
  const pool = allowed.length > 0 ? allowed : LETTERS;
  return pool[secureRandomIndex(pool.length)];
}

export function buildRound(letter: string): SlfRound {
  return { letter, status: "writing", answers: {}, points: {} };
}

export function newRound(used: string[], excluded: string[]): SlfRound {
  return buildRound(chooseLetter(used, excluded));
}

export function usedLetters(state: SlfState): string[] {
  return Object.values(state.rounds ?? {}).map((r) => r.letter);
}

export const POINT_STEPS = [0, 5, 10, 20] as const;

export function nextPoints(current: number): number {
  const i = POINT_STEPS.indexOf(current as (typeof POINT_STEPS)[number]);
  return POINT_STEPS[(i + 1) % POINT_STEPS.length];
}

/** Effective points: explicit value, else 10 for a filled answer, 0 otherwise. */
export function pointsFor(
  round: SlfRound,
  playerId: string,
  category: string,
): number {
  const explicit = round.points?.[`${playerId}:${category}`];
  if (explicit !== undefined) return explicit;
  return round.answers?.[playerId]?.[category]?.trim() ? 10 : 0;
}

export function roundTotal(
  round: SlfRound,
  playerId: string,
  categories: string[],
): number {
  return categories.reduce((sum, c) => sum + pointsFor(round, playerId, c), 0);
}

/** Totals over all scored (done) rounds. */
export function grandTotal(
  state: SlfState,
  playerId: string,
): number {
  return Object.values(state.rounds ?? {})
    .filter((r) => r.status === "done")
    .reduce(
      (sum, r) => sum + roundTotal(r, playerId, state.settings.categories),
      0,
    );
}
