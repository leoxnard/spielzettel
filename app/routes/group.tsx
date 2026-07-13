import { useEffect, useState } from "react";
import { data, isRouteErrorResponse, Link, useNavigate, useRevalidator } from "react-router";

import type { Route } from "./+types/group";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { GAMES } from "~/games/registry";
import { t } from "~/i18n/de";
import { getCurrentGroup, setCurrentGroup, useCurrentGroup } from "~/lib/current-group";
import { createGame } from "~/lib/game-api";
import { normalizeCode } from "~/lib/game-code";
import { fetchGroupByCode, fetchGroupGames, resetGroupGames } from "~/lib/group-api";
import { computeGroupStats, type GameEntry, type GroupStats } from "~/lib/group-stats";
import { PLAYER_COLORS, type GroupMember } from "~/lib/types";

export async function loader({ params }: Route.LoaderArgs) {
  const code = normalizeCode(params.code);
  const group = code ? await fetchGroupByCode(code) : null;
  if (!group) throw data(null, { status: 404 });
  const games = await fetchGroupGames(group.id);
  return { group, games };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.group.name || t.group.sectionTitle;
  return [{ title: `${name} · ${t.app.name}` }];
}

export default function GroupPage({ loaderData }: Route.ComponentProps) {
  const { group, games } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const current = useCurrentGroup();
  const [busy, setBusy] = useState(false);

  // Opening a group (e.g. via a shared link) makes it your current group —
  // keep your own name if you already had one for this group.
  useEffect(() => {
    const prev = getCurrentGroup();
    setCurrentGroup({
      id: group.id,
      code: group.code,
      name: group.name,
      playerName: prev?.id === group.id ? prev.playerName : undefined,
    });
  }, [group.id, group.code, group.name]);

  const stats = computeGroupStats(games);
  const playerName = current?.id === group.id ? current.playerName?.trim() : undefined;

  const startGame = async (slug: string) => {
    setBusy(true);
    try {
      const players = playerName
        ? [{ id: crypto.randomUUID(), name: playerName, color: PLAYER_COLORS[0] }]
        : undefined;
      const game = await createGame(slug, { groupId: group.id, players });
      navigate(`/game/${game.code}`);
    } catch {
      alert(t.error.saveFailed);
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm(t.group.resetConfirm)) return;
    setBusy(true);
    try {
      await resetGroupGames(group.id);
      revalidator.revalidate();
    } catch {
      alert(t.error.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 animate-fade-in-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t.group.backToGroups}
        </Link>
        <GroupCode code={group.code} />
      </div>

      <header className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          {t.group.sectionTitle}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          {group.name || t.group.unnamed}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t.group.totalGames(stats.totalGames)}
        </p>
      </header>

      <div className="space-y-5">
        <Card className="p-5">
          <p className="mb-1 text-sm font-medium">{t.group.newGame}</p>
          <p className="mb-3 text-xs text-muted">{t.group.newGameHint}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GAMES.map((g) => (
              <button
                key={g.slug}
                type="button"
                disabled={busy}
                onClick={() => startGame(g.slug)}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium shadow-sm transition-colors hover:bg-field disabled:opacity-50"
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${g.iconClass}`}>
                  {g.icon}
                </span>
                <span className="truncate">{g.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Members members={group.members} />

        <Leaderboard stats={stats} />

        {stats.byType.length > 0 && (
          <Card className="p-5">
            <p className="mb-3 text-sm font-medium">{t.group.gamesByType}</p>
            <BarList
              items={stats.byType.map((b) => ({ label: b.gameName, value: b.count }))}
            />
          </Card>
        )}

        <GamesList stats={stats} />

        {stats.totalGames > 0 && (
          <Button variant="danger" className="w-full" onClick={reset} disabled={busy}>
            {t.group.reset}
          </Button>
        )}
      </div>
    </main>
  );
}

function Leaderboard({ stats }: { stats: GroupStats }) {
  const ranked = stats.ranking.filter((p) => p.played > 0);
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-medium">{t.group.ranking}</p>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">{t.group.rankingEmpty}</p>
      ) : (
        <ol className="space-y-2">
          {ranked.map((p, i) => {
            const maxWins = Math.max(1, ranked[0].wins);
            return (
              <li key={p.name} className="flex items-center gap-3">
                <span className="w-5 text-center font-display text-sm font-semibold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {t.group.winsLabel(p.wins)} · {p.played} {t.group.played}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-field">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${(p.wins / maxWins) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-sm">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-field">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs text-muted">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Members({ members }: { members: GroupMember[] }) {
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-medium">
        {t.group.members} {members.length > 0 && (
          <span className="text-muted">· {members.length}</span>
        )}
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-muted">{t.group.membersEmpty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-field px-3 py-1 text-sm font-medium"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-ink">
                {m.name.trim().charAt(0).toUpperCase()}
              </span>
              {m.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function GamesList({ stats }: { stats: GroupStats }) {
  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-medium">{t.group.games}</p>
      {stats.games.length === 0 ? (
        <p className="text-sm text-muted">{t.group.gamesEmpty}</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {stats.games.map((entry) => (
            <GameRowItem key={entry.game.id} entry={entry} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function GameRowItem({ entry }: { entry: GameEntry }) {
  const { game, gameName, playerNames, leaderNames, statusLine, started } = entry;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <Link to={`/game/${game.code}`} className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{game.title || gameName}</span>
          {!started && (
            <span className="shrink-0 rounded-full bg-field px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t.group.lobbyBadge}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted">
          {playerNames.length > 0 ? playerNames.join(", ") : statusLine}
        </span>
      </Link>
      <span className="shrink-0 text-right text-xs">
        <span className="block text-primary">
          {leaderNames.length > 0 ? t.group.leading(leaderNames.join(" & ")) : statusLine}
        </span>
        <span className="block text-muted">{relativeDate(game.created_at)}</span>
      </span>
    </li>
  );
}

function relativeDate(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t.time.justNow;
  if (minutes < 60) return t.time.minutesAgo(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t.time.hoursAgo(hours);
  return t.time.daysAgo(Math.round(hours / 24));
}

function GroupCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${location.origin}/group/${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.app.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // cancelled
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm shadow-sm transition-colors hover:bg-field"
    >
      <span className="font-mono font-semibold tracking-[0.2em]">{code}</span>
      <span className="text-muted">·</span>
      <span className="text-muted">{copied ? t.lobby.copied : t.lobby.share}</span>
    </button>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-5xl font-semibold">
        {notFound ? "404" : t.error.title}
      </h1>
      <p className="text-muted">{notFound ? t.error.notFound : t.error.generic}</p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90"
      >
        {t.error.backHome}
      </Link>
    </main>
  );
}
