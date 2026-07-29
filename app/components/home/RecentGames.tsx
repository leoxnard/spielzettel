import { useState } from "react";
import { Link } from "react-router";

import { Badge } from "~/components/ui/Badge";
import { getGame } from "~/games/registry";
import { t } from "~/i18n/de";
import { deleteGame } from "~/lib/game-api";
import { removeRecentGame, useRecentGames, type RecentGame } from "~/lib/recent-games";
import { PLAYER_COLORS, type GameStatus } from "~/lib/types";

function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return t.time.justNow;
  if (minutes < 60) return t.time.minutesAgo(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t.time.hoursAgo(hours);
  return t.time.daysAgo(Math.round(hours / 24));
}

const statusLabel: Record<GameStatus, string> = {
  playing: t.home.running,
  lobby: t.home.inLobby,
  finished: t.home.finished,
};

function groupColorsFor(games: RecentGame[]) {
  const colors = new Map<string, string>();
  for (const g of games) {
    if (g.groupId && !colors.has(g.groupId)) {
      colors.set(g.groupId, PLAYER_COLORS[colors.size % PLAYER_COLORS.length]);
    }
  }
  return colors;
}

function GameRow({ game, deletingId, onDelete }: {
  game: RecentGame;
  deletingId: string | null;
  onDelete: (g: RecentGame) => void;
}) {
  const def = getGame(game.gameType);
  if (!def) return null;
  const name = game.title || def.name;
  return (
    <li className="flex items-center gap-2">
      <Link
        to={`/game/${game.code}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={game.status === "playing" ? "live" : "neutral"}>
              {statusLabel[game.status]}
            </Badge>
            <span className="text-xs text-muted">
              {relativeTime(game.visitedAt)}
            </span>
          </div>
          <p className="mt-1.5 truncate font-display text-base font-semibold tracking-tight">
            {name}
          </p>
          <p className="truncate text-xs text-muted">
            {def.name} · <span className="font-mono">{game.code}</span> ·{" "}
            {game.playerCount} {t.home.players}
            {game.winners && game.winners.length > 0 && (
              <>
                {" · "}
                🏆{" "}
                <span className="font-medium">{game.winners.join(" & ")}</span>
              </>
            )}
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted"
          aria-hidden
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={() => onDelete(game)}
        disabled={deletingId === game.id}
        aria-label={t.lobby.deleteGame}
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-surface text-muted shadow-sm transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
        </svg>
      </button>
    </li>
  );
}

export function ActiveGames() {
  const active = useRecentGames().filter((g) => g.status === "playing");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  if (active.length === 0) return null;

  const handleDelete = async (game: RecentGame) => {
    setDeletingId(game.id);
    try {
      await deleteGame(game.id);
      removeRecentGame(game.id);
    } catch {
      alert(t.error.saveFailed);
      setDeletingId(null);
    }
  };

  const groupColors = groupColorsFor(active);

  return (
    <section className="animate-fade-in">
      <h2 className="mb-3 flex items-baseline gap-2 px-1">
        <span className="font-display text-lg font-semibold tracking-tight">
          {t.home.continueTitle}
        </span>
        <span className="text-xs text-muted">{t.home.continueSubtitle}</span>
      </h2>
      <ul className="space-y-2.5">
        {active.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            deletingId={deletingId}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </section>
  );
}

export function FinishedGames() {
  const finished = useRecentGames().filter((g) => g.status === "finished");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  if (finished.length === 0) return null;

  const handleDelete = async (game: RecentGame) => {
    setDeletingId(game.id);
    try {
      await deleteGame(game.id);
      removeRecentGame(game.id);
    } catch {
      alert(t.error.saveFailed);
      setDeletingId(null);
    }
  };

  return (
    <section className="animate-fade-in">
      <h2 className="mb-3 flex items-baseline gap-2 px-1">
        <span className="font-display text-lg font-semibold tracking-tight">
          {t.home.finishedTitle}
        </span>
      </h2>
      <ul className="space-y-2.5">
        {finished.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            deletingId={deletingId}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </section>
  );
}