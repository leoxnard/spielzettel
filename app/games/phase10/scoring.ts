export interface Phase10Entry {
  points: number | null;
  done: boolean;
  [key: string]: number | boolean | null;
}

export const PHASE_COUNT = 10;

/** Current phase = 1 + completed phases (a finished game shows 10). */
export function phaseOf(entries: (Phase10Entry | undefined)[]): number {
  const done = entries.filter((e) => e?.done).length;
  return Math.min(PHASE_COUNT, done + 1);
}

/** True once a player has completed all ten phases. */
export function hasFinished(entries: (Phase10Entry | undefined)[]): boolean {
  return entries.filter((e) => e?.done).length >= PHASE_COUNT;
}

export function phase10RoundScore(entry: Phase10Entry): number {
  return entry.points ?? 0;
}
