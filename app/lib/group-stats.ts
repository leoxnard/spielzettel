import { getGame } from "~/games/registry";
import type { GameRow } from "./types";

export interface PlayerStat {
  name: string;
  played: number;
  wins: number;
}

export interface GameEntry {
  game: GameRow;
  gameName: string;
  /** Stats bucket — the game's `groupLabel` (e.g. preset name) or its name. */
  gameLabel: string;
  playerNames: string[];
  /** Current leader(s) / final winner(s) — empty when nothing is played yet. */
  leaderNames: string[];
  /** e.g. "Runde 3 von 20" or "5/26 Felder" — the live progress line. */
  statusLine: string;
  /** True once the board holds real game data (not just a fresh lobby). */
  started: boolean;
}

export interface GroupStats {
  /** Leaderboard, best first (wins, then games played). */
  ranking: PlayerStat[];
  /** Every group game, newest first — including running and lobby games. */
  games: GameEntry[];
  /** Games per game type, most-played first. */
  byType: { gameName: string; count: number }[];
  /** All games in the group. */
  totalGames: number;
  /** Games that have actually been played (have a result). */
  playedGames: number;
}

const norm = (name: string) => name.trim().toLowerCase();

/**
 * The stats bucket for a game: its `groupLabel` (e.g. Punkteblock's chosen
 * preset) or, failing that, the game's generic name. Empty for unknown games.
 */
export function gameLabel(game: GameRow): string {
  const def = getGame(game.game_type);
  if (!def) return "";
  try {
    return def.groupLabel?.(game.state) ?? def.name;
  } catch {
    return def.name;
  }
}

/**
 * Per-player wins/games over a set of games. Extracted so the leaderboard can
 * be recomputed for a single game filter without re-deriving everything else.
 */
export function computeRanking(games: GameRow[]): PlayerStat[] {
  const stats = new Map<string, PlayerStat>();
  const ensure = (name: string): PlayerStat => {
    const key = norm(name);
    let entry = stats.get(key);
    if (!entry) {
      entry = { name: name.trim(), played: 0, wins: 0 };
      stats.set(key, entry);
    }
    return entry;
  };

  for (const game of games) {
    const def = getGame(game.game_type);
    if (!def || !def.hasStarted(game.state)) continue;

    let winnerIds: string[] = [];
    try {
      winnerIds = def.getWinnerIds?.(game.state, game.players) ?? [];
    } catch {
      winnerIds = [];
    }
    if (winnerIds.length === 0) continue;

    const winnerNameSet = new Set(
      winnerIds
        .map((id) => game.players.find((p) => p.id === id)?.name)
        .filter((n): n is string => !!n)
        .map(norm),
    );
    for (const player of game.players) {
      const entry = ensure(player.name);
      entry.played++;
      if (winnerNameSet.has(norm(player.name))) entry.wins++;
    }
  }

  return [...stats.values()].sort(
    (a, b) => b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name),
  );
}

/**
 * Aggregates a group's games into a leaderboard + a game list. Players are
 * identified by name (case-insensitive), taken straight from each game's own
 * player list. A game only belongs to the group once it's actually been
 * started — games abandoned in the lobby are ignored, so a game that was set
 * up but never played never shows up. Only games with a determinable result
 * count toward "played"/"wins".
 */
export function computeGroupStats(games: GameRow[]): GroupStats {
  const entries: GameEntry[] = [];
  const typeCounts = new Map<string, number>();
  let playedGames = 0;

  for (const game of games) {
    const def = getGame(game.game_type);
    if (!def) continue;

    // Games left sitting in the lobby aren't saved to the group — only ones
    // that were actually started count.
    const started = def.hasStarted(game.state);
    if (!started) continue;

    // A single malformed game must never break the whole group page.
    let winnerIds: string[] = [];
    try {
      winnerIds = def.getWinnerIds?.(game.state, game.players) ?? [];
    } catch {
      winnerIds = [];
    }
    const winnerNameSet = new Set(
      winnerIds
        .map((id) => game.players.find((p) => p.id === id)?.name)
        .filter((n): n is string => !!n)
        .map(norm),
    );

    let statusLine = "";
    try {
      statusLine = def.getStatusLine(game.state, game.players);
    } catch {
      statusLine = "";
    }

    const label = gameLabel(game);
    entries.push({
      game,
      gameName: def.name,
      gameLabel: label,
      playerNames: game.players.map((p) => p.name),
      leaderNames: game.players
        .filter((p) => winnerNameSet.has(norm(p.name)))
        .map((p) => p.name),
      statusLine,
      started,
    });
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);

    if (winnerIds.length > 0) playedGames++;
  }

  const byType = [...typeCounts.entries()]
    .map(([gameName, count]) => ({ gameName, count }))
    .sort((a, b) => b.count - a.count);

  return {
    ranking: computeRanking(games),
    games: entries,
    byType,
    totalGames: entries.length,
    playedGames,
  };
}
