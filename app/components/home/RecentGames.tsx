import { Link } from "react-router";

import { Badge } from "~/components/ui/Badge";
import { getGame } from "~/games/registry";
import { t } from "~/i18n/de";
import { useRecentGames } from "~/lib/recent-games";
import type { GameStatus } from "~/lib/types";

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
  const recent = useRecentGames();
  if (recent.length === 0) return null;

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
          return (
            <li key={game.id}>
              <Link
                to={`/game/${game.code}`}
                className="flex items-center justify-between gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
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
                    {game.title || def.name}
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
