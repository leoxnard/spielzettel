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

/** Ids of everyone sharing a score with playerId (just playerId without teams). */
export function teamOf<E extends Json, S extends BaseSettings>(
  config: RoundsConfig<E, S>,
  players: Player[],
  playerId: string,
): string[] {
  return config.teams?.(players).find((team) => team.includes(playerId)) ?? [
    playerId,
  ];
}

/**
 * Score shown for a player in one round: their own entry's score, or their
 * team's combined score in partnership games. Undefined if nothing entered.
 */
export function playerRoundScore<E extends Json, S extends BaseSettings>(
  state: RoundsState<E, S>,
  config: RoundsConfig<E, S>,
  players: Player[],
  roundIndex: number,
  playerId: string,
): number | undefined {
  if (!config.teams || !config.teamRoundScore) {
    const entry = entryAt(state, roundIndex, playerId);
    return entry === undefined ? undefined : config.roundScore(entry, roundIndex);
  }
  const entries = teamOf(config, players, playerId).map((id) =>
    entryAt(state, roundIndex, id),
  );
  if (entries.every((e) => e === undefined)) return undefined;
  return config.teamRoundScore(entries, roundIndex);
}

export function totals<E extends Json, S extends BaseSettings>(
  state: RoundsState<E, S>,
  config: RoundsConfig<E, S>,
  players: Player[],
): Record<string, number> {
  if (config.teams && config.teamTotalScore) {
    const teamTotal = config.teamTotalScore;
    return Object.fromEntries(
      players.map((p) => {
        const team = teamOf(config, players, p.id);
        const rounds = Array.from({ length: state.currentRound }, (_, i) =>
          team.map((id) => entryAt(state, i, id)),
        );
        return [p.id, teamTotal(rounds, state.settings)];
      }),
    );
  }
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

/** Who leads right now — the winners if the game is ended early. */
export function leaderIds<E extends Json, S extends BaseSettings>(
  state: RoundsState<E, S>,
  config: RoundsConfig<E, S>,
  players: Player[],
): string[] {
  if (players.length === 0) return [];
  const scores = totals(state, config, players);
  if (config.leaders) return config.leaders({ totals: scores, state, players });
  const low = config.leaderDirection?.(state.settings) === "low";
  const values = players.map((p) => scores[p.id]);
  const best = low ? Math.min(...values) : Math.max(...values);
  return players.filter((p) => scores[p.id] === best).map((p) => p.id);
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
