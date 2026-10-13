export interface WizardEntry {
  bid: number | null;
  tricks: number | null;
}

/**
 * Exact prediction: 20 + 10 per trick. Off: −10 per trick of difference.
 * Empty tricks count as 0, so a 0 bid left untouched still scores 20.
 */
export function wizardRoundScore(entry: WizardEntry): number {
  if (entry.bid === null) return 0;
  const tricks = entry.tricks ?? 0;
  return entry.bid === tricks
    ? 20 + 10 * tricks
    : -10 * Math.abs(entry.bid - tricks);
}

/** 60 cards dealt out completely: rounds = floor(60 / players). */
export function wizardMaxRounds(playerCount: number): number {
  return Math.floor(60 / Math.max(1, playerCount));
}

/** Round r (0-based) is played with r+1 cards. */
export function wizardCards(roundIndex: number): number {
  return roundIndex + 1;
}
