import type { BidTricksEntry } from "../rounds/BidTricksEditor";

export const SPADES_BAG_PENALTY = 100;
export const SPADES_BAGS_PER_PENALTY = 10;

/**
 * Individual scoring: made bid = 10/Stich + 1 je Bag, missed = −10/Stich.
 * Nil (bid 0): +100 geschafft, −100 verfehlt.
 */
export function spadesRoundScore(entry: BidTricksEntry): number {
  const { bid, tricks } = entry;
  if (bid === null || tricks === null) return 0;
  if (bid === 0) return tricks === 0 ? 100 : -100;
  if (tricks >= bid) return 10 * bid + (tricks - bid);
  return -10 * bid;
}

/** Bags a made non-nil bid collects in one round. */
export function spadesBags(entry: BidTricksEntry): number {
  const { bid, tricks } = entry;
  if (bid === null || tricks === null || bid === 0) return 0;
  return tricks > bid ? tricks - bid : 0;
}

/** Sum of round scores minus 100 for every 10 collected bags. */
export function spadesTotal(entries: (BidTricksEntry | undefined)[]): number {
  let score = 0;
  let bags = 0;
  for (const entry of entries) {
    if (!entry) continue;
    score += spadesRoundScore(entry);
    bags += spadesBags(entry);
  }
  return (
    score - Math.floor(bags / SPADES_BAGS_PER_PENALTY) * SPADES_BAG_PENALTY
  );
}
