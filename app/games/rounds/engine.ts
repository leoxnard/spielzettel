import type { Json, Player } from "~/lib/types";
import type { BaseSettings } from "../types";
import type { RoundsConfig, RoundsState, Verdict } from "./types";

export function entryAt<E extends Json>(
  state: RoundsState<E, BaseSettings>,
  roundIndex: number,
  playerId: string,
): E | undefined {
  return state.rounds?.[String(roundIndex)]?.[playerId];
}

/** A player's entries for the completed rounds 0 … playedRounds-1. */
export function completedEntries<E extends Json>(
  state: RoundsState<E, BaseSettings>,
  playerId: string,
): (E | undefined)[] {
  return Array.from({ length: state.currentRound }, (_, i) =>
    entryAt(state, i, playerId),
  );
}

export function totals<E extends Json, S extends BaseSettings>(
  state: RoundsState<E, S>,
  config: RoundsConfig<E, S>,
  players: Player[],
): Record<string, number> {
  return Object.fromEntries(
    players.map((p) => {
      const entries = completedEntries(state, p.id);
      const total = config.totalScore
        ? config.totalScore(entries, state.settings)
        : entries.reduce<number>(
            (sum, e, i) => sum + (e === undefined ? 0 : config.roundScore(e, i)),
            0,
          );
      return [p.id, total];
    }),
  );
}

/** Who begins/deals a round: rotates from the lobby's start player. */
export function starterForRound(
  players: Player[],
  settings: BaseSettings,
  roundIndex: number,
): Player | undefined {
  if (players.length === 0) return undefined;
  const base = Math.max(
    0,
    players.findIndex((p) => p.id === settings.startPlayerId),
  );
  return players[(base + roundIndex) % players.length];
}

export function verdictOf<E extends Json, S extends BaseSettings>(
  state: RoundsState<E, S>,
  config: RoundsConfig<E, S>,
  players: Player[],
): Verdict {
  return config.verdict({
    totals: totals(state, config, players),
    state,
    players,
    playedRounds: state.currentRound,
  });
}

/** Shared verdict: game ends when someone reaches the (optional) limit. */
export function limitVerdict(
  totals: Record<string, number>,
  limit: number | null | undefined,
  mode: "win" | "lose",
  reason: (limit: number) => string,
): Verdict {
  if (!limit) return { over: false, winnerIds: [] };
  const values = Object.entries(totals);
  if (!values.some(([, total]) => total >= limit)) {
    return { over: false, winnerIds: [] };
  }
  const best =
    mode === "win"
      ? Math.max(...values.map(([, v]) => v))
      : Math.min(...values.map(([, v]) => v));
  return {
    over: true,
    winnerIds: values.filter(([, v]) => v === best).map(([id]) => id),
    reason: reason(limit),
  };
}

/** Shared verdict: fixed round count, highest total wins. */
export function lastRoundVerdict(
  totals: Record<string, number>,
  playedRounds: number,
  maxRounds: number | null,
  reason: string,
): Verdict {
  if (maxRounds === null || playedRounds < maxRounds) {
    return { over: false, winnerIds: [] };
  }
  const values = Object.entries(totals);
  const best = Math.max(...values.map(([, v]) => v));
  return {
    over: true,
    winnerIds: values.filter(([, v]) => v === best).map(([id]) => id),
    reason,
  };
}
