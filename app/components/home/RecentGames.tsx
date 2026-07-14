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

export function RecentGames() {
  // Only games that were actually started belong on "Weiterspielen" — games
  // left sitting in the lobby are left out.
  const recent = useRecentGames().filter((g) => g.status !== "lobby");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  if (recent.length === 0) return null;

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

  // Assign each distinct group a color by order of appearance, so two
  // different groups in the list never land on the same hue (a hash would
  // sometimes collide across the 6-color palette).
  const groupColors = new Map<string, string>();
  for (const g of recent) {
    if (g.groupId && !groupColors.has(g.groupId)) {
      groupColors.set(g.groupId, PLAYER_COLORS[groupColors.size % PLAYER_COLORS.length]);
    }
  }

  return (
    <section className="animate-fade-in">
      <h2 className="mb-3 flex items-baseline gap-2 px-1">
        <span className="font-display text-lg font-semibold tracking-tight">
          {t.home.continueTitle}
        </span>
        <span className="text-xs text-muted">{t.home.continueSubtitle}</span>
      </h2>
      <ul className="space-y-2.5">
        {recent.map((game) => {
          const def = getGame(game.gameType);
          if (!def) return null;
          const name = game.title || def.name;
          const color = game.groupId ? groupColors.get(game.groupId) ?? null : null;
          return (
            <li key={game.id} className="flex items-center gap-2">
              <Link
                to={`/game/${game.code}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
                style={
                  color
                    ? { borderLeftColor: color, borderLeftWidth: 4, paddingLeft: 17 }
                    : undefined
                }
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={game.status === "playing" ? "live" : "neutral"}>
                      {statusLabel[game.status]}
                    </Badge>
                    {game.groupName && color && (
                      <span
                        className="inline-flex max-w-32 items-center gap-1 truncate rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ color, backgroundColor: `${color}1f` }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span className="truncate">{game.groupName}</span>
                      </span>
                    )}
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
                onClick={() => handleDelete(game)}
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
        })}
      </ul>
    </section>
  );
}
