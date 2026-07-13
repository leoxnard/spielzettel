import type { BaseSettings } from "../types";

export interface SlfSettings extends BaseSettings {
  categories: string[];
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
const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split("");

export function randomLetter(used: string[]): string {
  const free = LETTERS.filter((l) => !used.includes(l));
  const pool = free.length > 0 ? free : LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function newRound(used: string[]): SlfRound {
  return { letter: randomLetter(used), status: "writing", answers: {}, points: {} };
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
