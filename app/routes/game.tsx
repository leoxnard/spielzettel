import { useEffect } from "react";
import { data, isRouteErrorResponse, Link } from "react-router";

import type { Route } from "./+types/game";
import { Badge } from "~/components/ui/Badge";
import { Lobby } from "~/components/game/Lobby";
import { ShareCode } from "~/components/game/ShareCode";
import { getGame } from "~/games/registry";
import { t } from "~/i18n/de";
import {
  fetchGameByCode,
  mergeStateAt,
  setStateAt,
  updateGame,
} from "~/lib/game-api";
import { normalizeCode } from "~/lib/game-code";
import { fetchGroupById } from "~/lib/group-api";
import { recordRecentGame } from "~/lib/recent-games";
import { pageMeta } from "~/lib/seo";
import { useRealtimeGame } from "~/lib/use-realtime-game";

export async function loader({ params }: Route.LoaderArgs) {
  const code = normalizeCode(params.code);
  const game = code ? await fetchGameByCode(code) : null;
  if (!game || !getGame(game.game_type)) {
    throw data(null, { status: 404 });
  }
  // Group games pick players from the group roster in the lobby.
  const group = game.group_id ? await fetchGroupById(game.group_id) : null;
  return { game, group };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  const path = `/game/${params.code}`;
  if (!loaderData) {
    return pageMeta({
      title: t.app.name,
      description: t.home.subline,
      path,
      noindex: true,
    });
  }
  const name = getGame(loaderData.game.game_type)?.name;
  const title = loaderData.game.title;
  return pageMeta({
    title: [title, name, t.app.name].filter(Boolean).join(" · "),
    description: t.home.subline,
    path,
    noindex: true,
  });
}

export default function Game({ loaderData }: Route.ComponentProps) {
  const game = useRealtimeGame(loaderData.game);
  const group = loaderData.group;
  const definition = getGame(game.game_type)!;

  useEffect(() => {
    recordRecentGame({
      id: game.id,
      code: game.code,
      gameType: game.game_type,
      title: game.title,
      status: game.status,
      playerCount: game.players.length,
      visitedAt: Date.now(),
      groupId: group?.id ?? null,
      groupName: group?.name ?? null,
    });
  }, [
    game.id,
    game.code,
    game.game_type,
    game.title,
    game.status,
    game.players.length,
    group?.id,
    group?.name,
  ]);

  const playing = game.status === "playing";
  const statusLine = playing
    ? definition.getStatusLine(game.state, game.players)
    : null;

  // While a game is being played, a phone in landscape gets an immersive
  // full-screen board (no header/footer/titles) — see .immersive rules in
  // app.css. Portrait and larger screens are untouched.
  useEffect(() => {
    if (!playing) return;
    const root = document.documentElement;
    root.classList.add("immersive");
    return () => root.classList.remove("immersive");
  }, [playing]);

  return (
    <main className="game-main mx-auto w-full max-w-3xl px-4 py-6 animate-fade-in-up">
      <div className="game-chrome mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {playing ? t.game.backToGames : t.lobby.backToGames}
        </Link>
        <div className="flex items-center gap-2">
          {playing && (
            <button
              type="button"
              onClick={() => updateGame(game.id, { status: "lobby" }).catch(() => {})}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm shadow-sm transition-colors hover:bg-field"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              {t.game.backToLobby}
            </button>
          )}
          <ShareCode code={game.code} />
        </div>
      </div>

      {playing ? (
        <>
          <div className="game-chrome mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                {definition.name}
              </span>
              <Badge variant="live">{t.lobby.live}</Badge>
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {game.title || definition.boardTitle}
            </h1>
            {statusLine && (
              <p className="mt-1 text-sm text-muted">
                {t.game.playersCount(game.players.length)} · {statusLine}
              </p>
            )}
          </div>
          <definition.Board
            game={game}
            state={game.state}
            players={game.players}
            setStateAt={(path, value) => setStateAt(game.id, path, value)}
            mergeStateAt={(path, value) => mergeStateAt(game.id, path, value)}
          />
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <span
              className={`flex size-12 items-center justify-center rounded-2xl shadow-sm ${definition.iconClass}`}
            >
              {definition.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">
                  {definition.name}
                </h1>
                <Badge variant="live">{t.lobby.live}</Badge>
              </div>
              <p className="text-sm text-muted">{definition.lobbySubtitle}</p>
            </div>
          </div>
          <Lobby game={game} definition={definition} group={group} />
        </>
      )}
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-5xl font-semibold">
        {notFound ? "404" : t.error.title}
      </h1>
      <p className="text-muted">
        {notFound ? t.error.notFound : t.error.generic}
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90"
      >
        {t.error.backHome}
      </Link>
    </main>
  );
}
