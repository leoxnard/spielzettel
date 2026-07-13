export interface WizardEntry {
  bid: number | null;
  tricks: number | null;
}

/** Exact prediction: 20 + 10/Stich. Daneben: −10 je Stich Abweichung. */
export function wizardRoundScore(entry: WizardEntry): number {
  if (entry.bid === null || entry.tricks === null) return 0;
  return entry.bid === entry.tricks
    ? 20 + 10 * entry.tricks
    : -10 * Math.abs(entry.bid - entry.tricks);
}

/** 60 cards dealt out completely: rounds = floor(60 / players). */
export function wizardMaxRounds(playerCount: number): number {
  return Math.floor(60 / Math.max(1, playerCount));
}

/** Round r (0-based) is played with r+1 cards. */
export function wizardCards(roundIndex: number): number {
  return roundIndex + 1;
}
