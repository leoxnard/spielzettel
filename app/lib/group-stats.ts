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
 * Aggregates a group's games into a leaderboard + a full game list. Players
 * are identified by name (case-insensitive), taken straight from each game's
 * own player list. Every group game shows up in `games` (so running and
 * freshly-created lobby games stay visible); only games with a determinable
 * result count toward "played"/"wins".
 */
export function computeGroupStats(games: GameRow[]): GroupStats {
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

  const entries: GameEntry[] = [];
  const typeCounts = new Map<string, number>();
  let playedGames = 0;

  for (const game of games) {
    const def = getGame(game.game_type);
    if (!def) continue;

    const started = def.hasStarted(game.state);
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

    entries.push({
      game,
      gameName: def.name,
      playerNames: game.players.map((p) => p.name),
      leaderNames: game.players
        .filter((p) => winnerNameSet.has(norm(p.name)))
        .map((p) => p.name),
      statusLine,
      started,
    });
    typeCounts.set(def.name, (typeCounts.get(def.name) ?? 0) + 1);

    // Only played games (with a result) feed the leaderboard.
    if (winnerIds.length > 0) {
      playedGames++;
      for (const player of game.players) {
        const entry = ensure(player.name);
        entry.played++;
        if (winnerNameSet.has(norm(player.name))) entry.wins++;
      }
    }
  }

  const ranking = [...stats.values()].sort(
    (a, b) => b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name),
  );
  const byType = [...typeCounts.entries()]
    .map(([gameName, count]) => ({ gameName, count }))
    .sort((a, b) => b.count - a.count);

  return { ranking, games: entries, byType, totalGames: entries.length, playedGames };
}
