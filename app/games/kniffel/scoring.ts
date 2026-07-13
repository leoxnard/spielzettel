import {
  ALL_CATEGORIES,
  BONUS_POINTS,
  BONUS_THRESHOLD,
  LOWER_CATEGORIES,
  UPPER_CATEGORIES,
  type KniffelScores,
  type KniffelState,
} from "./types";

export function upperSubtotal(scores: KniffelScores): number {
  return UPPER_CATEGORIES.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
}

export function bonus(scores: KniffelScores): number {
  return upperSubtotal(scores) >= BONUS_THRESHOLD ? BONUS_POINTS : 0;
}

/** True once every upper category is filled — the bonus is decided. */
export function upperComplete(scores: KniffelScores): boolean {
  return UPPER_CATEGORIES.every((c) => scores[c.id] !== undefined);
}

export function lowerSubtotal(scores: KniffelScores): number {
  return LOWER_CATEGORIES.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
}

export function grandTotal(scores: KniffelScores): number {
  return upperSubtotal(scores) + bonus(scores) + lowerSubtotal(scores);
}

export function filledCount(scores: KniffelScores): number {
  return ALL_CATEGORIES.filter((c) => scores[c.id] !== undefined).length;
}

export function playerScores(
  state: KniffelState,
  playerId: string,
): KniffelScores {
  return state.scores?.[playerId] ?? {};
}
