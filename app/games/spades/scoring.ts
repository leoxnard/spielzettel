import type { BidTricksEntry } from "../rounds/BidTricksEditor";

export const SPADES_BAG_PENALTY = 100;
export const SPADES_BAGS_PER_PENALTY = 10;

/**
 * Individual scoring: made bid = 10/Stich + 1 je Bag, missed = −10/Stich.
 * Nil (bid 0): +100 geschafft, −100 verfehlt.
 */
export function spadesRoundScore(entry: BidTricksEntry): number {
  const { bid } = entry;
  // Tricks left empty after the round mean none were taken.
  const tricks = entry.tricks ?? 0;
  if (bid === null) return 0;
  if (bid === 0) return tricks === 0 ? 100 : -100;
  if (tricks >= bid) return 10 * bid + (tricks - bid);
  return -10 * bid;
}

/** Bags a made non-nil bid collects in one round. */
export function spadesBags(entry: BidTricksEntry): number {
  const { bid } = entry;
  const tricks = entry.tricks ?? 0;
  if (bid === null || bid === 0) return 0;
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

/**
 * Partnerships: with 4 or 6 players, partners sit opposite each other
 * (seat i and i + n/2). With 2, 3 or 5 players everyone plays alone
 * (cutthroat), modelled as teams of one.
 */
export function spadesTeams<P extends { id: string }>(players: P[]): string[][] {
  const n = players.length;
  if (n !== 4 && n !== 6) return players.map((p) => [p.id]);
  const half = n / 2;
  return players
    .slice(0, half)
    .map((p, i) => [p.id, players[i + half].id]);
}

/**
 * One team's round: non-nil bids and tricks are added up into one team
 * contract (made = 10 per bid trick + 1 per bag, missed = −10 per bid
 * trick). Every nil bid scores ±100 on its own; tricks a nil bidder takes
 * don't count toward the partner's contract. Players without a bid are skipped; empty tricks count as 0.
 */
function spadesTeamRound(entries: (BidTricksEntry | undefined)[]): {
  score: number;
  bags: number;
} {
  let score = 0;
  let bid = 0;
  let tricks = 0;
  let hasContract = false;
  for (const entry of entries) {
    if (!entry || entry.bid === null) continue;
    // Tricks left empty after the round mean none were taken.
    const taken = entry.tricks ?? 0;
    if (entry.bid === 0) {
      score += taken === 0 ? 100 : -100;
    } else {
      hasContract = true;
      bid += entry.bid;
      tricks += taken;
    }
  }
  if (!hasContract) return { score, bags: 0 };
  if (tricks >= bid) return { score: score + 10 * bid + (tricks - bid), bags: tricks - bid };
  return { score: score - 10 * bid, bags: 0 };
}

export function spadesTeamRoundScore(
  entries: (BidTricksEntry | undefined)[],
): number {
  return spadesTeamRound(entries).score;
}

/** Team total: sum of round scores minus 100 for every 10 team bags. */
export function spadesTeamTotal(
  rounds: (BidTricksEntry | undefined)[][],
): number {
  let score = 0;
  let bags = 0;
  for (const entries of rounds) {
    const round = spadesTeamRound(entries);
    score += round.score;
    bags += round.bags;
  }
  return (
    score - Math.floor(bags / SPADES_BAGS_PER_PENALTY) * SPADES_BAG_PENALTY
  );
}

/** Team bags collected toward the next −100 penalty (0–9). */
export function spadesTeamBags(rounds: (BidTricksEntry | undefined)[][]): number {
  const bags = rounds.reduce((sum, entries) => sum + spadesTeamRound(entries).bags, 0);
  return bags % SPADES_BAGS_PER_PENALTY;
}
