import { useEffect, useState } from "react";
import {
  data,
  isRouteErrorResponse,
  Link,
  useNavigate,
  useRevalidator,
} from "react-router";

import type { Route } from "./+types/group";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Collapsible } from "~/components/ui/Collapsible";
import { Modal } from "~/components/ui/Modal";
import { t } from "~/i18n/de";
import { clearCurrentGroup, setCurrentGroup } from "~/lib/current-group";
import { normalizeCode } from "~/lib/game-code";
import {
  addGroupMember,
  deleteGroup,
  fetchGroupByCode,
  fetchGroupGames,
  mergeGroupPlayers,
  removeGroupMember,
  renameGroupMember,
  resetGroupGames,
  setGroupSecret,
} from "~/lib/group-api";
import {
  computeGroupStats,
  computeRanking,
  gameLabel,
  type GameEntry,
  type GroupStats,
} from "~/lib/group-stats";
import { type GameRow, type GroupRow } from "~/lib/types";

const norm = (s: string) => s.trim().toLowerCase();
import { useRealtimeGroup } from "~/lib/use-realtime-group";

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
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Opening a group (e.g. via a shared link) makes it your current group.
  useEffect(() => {
    setCurrentGroup({ id: group.id, code: group.code, name: group.name });
  }, [group.id, group.code, group.name]);

  // Live updates: new games, score changes and new members appear without a
  // manual reload.
  useRealtimeGroup(group.id, () => revalidator.revalidate());

  const stats = computeGroupStats(games);

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

  const remove = async () => {
    if (!confirm(t.group.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      clearCurrentGroup();
      navigate("/");
    } catch {
      alert(t.error.saveFailed);
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
        <Members
          group={group}
          games={stats.games.map((e) => e.game)}
          onChanged={() => revalidator.revalidate()}
        />

        <Leaderboard stats={stats} games={games} />

        {stats.byType.length > 0 && (
          <Card className="p-5">
            <p className="mb-3 font-display text-base font-semibold">{t.group.gamesByType}</p>
            <BarList
              items={stats.byType.map((b) => ({ label: b.gameName, value: b.count }))}
            />
          </Card>
        )}

        <GamesList stats={stats} />

        <SecretSettings
          group={group}
          onChanged={() => revalidator.revalidate()}
        />

        {stats.totalGames > 0 && (
          <Button variant="danger" className="w-full" onClick={reset} disabled={busy}>
            {t.group.reset}
          </Button>
        )}

        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="w-full py-2 text-center text-sm font-medium text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {t.group.deleteGroup}
        </button>
      </div>
    </main>
  );
}

function Leaderboard({ stats, games }: { stats: GroupStats; games: GameRow[] }) {
  const [filter, setFilter] = useState("");
  // Recompute the ranking for the selected game only; "" = all games.
  const ranking = filter
    ? computeRanking(games.filter((g) => gameLabel(g) === filter))
    : stats.ranking;
  const ranked = ranking.filter((p) => p.played > 0);
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-semibold">{t.group.ranking}</p>
        {stats.byType.length > 1 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 max-w-40 rounded-lg border border-border bg-field px-2.5 text-xs focus:border-primary focus:outline-none"
          >
            <option value="">{t.group.rankingAllGames}</option>
            {stats.byType.map((b) => (
              <option key={b.gameName} value={b.gameName}>
                {b.gameName}
              </option>
            ))}
          </select>
        )}
      </div>
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

/** Distinct player identities across the group's games (first spelling wins). */
function distinctGamePlayers(games: GameRow[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const g of games) {
    for (const p of g.players) {
      const id = norm(p.name);
      if (id && !byId.has(id)) byId.set(id, p.name.trim());
    }
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function MergePlayersModal({
  group,
  games,
  open,
  onClose,
  onChanged,
}: {
  group: GroupRow;
  games: GameRow[];
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [busy, setBusy] = useState(false);

  const players = distinctGamePlayers(games);
  const byId = new Map(players.map((p) => [p.id, p.name]));

  const coPlayed =
    !!fromId &&
    !!toId &&
    fromId !== toId &&
    games.some((g) => {
      const ids = g.players.map((p) => norm(p.name));
      return ids.includes(fromId) && ids.includes(toId);
    });

  const canMerge = !!fromId && !!toId && fromId !== toId && !coPlayed && !busy;

  const merge = async () => {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to || !canMerge) return;
    if (!confirm(t.group.mergeConfirm(from, to))) return;
    setBusy(true);
    try {
      await mergeGroupPlayers(games, from, to);
      // Collapse the roster entry too, but only if the merged-away name is
      // actually a member — renaming a non-member would drop the survivor.
      if (group.members.some((m) => m.id === fromId)) {
        await renameGroupMember(group.id, fromId, to);
      }
      setFromId("");
      setToId("");
      onChanged();
      onClose();
    } catch {
      alert(t.error.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const selectClass =
    "h-10 min-w-0 flex-1 rounded-lg border border-border bg-field px-2.5 text-sm focus:border-primary focus:outline-none";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.group.mergeTitle}
      subtitle={t.group.mergeHint}
    >
      <div className="flex items-center gap-2">
        <select
          value={fromId}
          disabled={busy}
          onChange={(e) => setFromId(e.target.value)}
          className={selectClass}
        >
          <option value="">{t.group.mergeSelect}</option>
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === toId}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-xs text-muted">{t.group.mergeInto}</span>
        <select
          value={toId}
          disabled={busy}
          onChange={(e) => setToId(e.target.value)}
          className={selectClass}
        >
          <option value="">{t.group.mergeSelect}</option>
          {players.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === fromId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {coPlayed && (
        <p className="mt-2 text-xs text-danger">{t.group.mergeCoPlayed}</p>
      )}
      <Button className="mt-4 w-full" onClick={merge} disabled={!canMerge}>
        {t.group.mergeButton}
      </Button>
    </Modal>
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

function Members({
  group,
  games,
  onChanged,
}: {
  group: GroupRow;
  games: GameRow[];
  onChanged: () => void;
}) {
  const members = group.members;
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  // Merge needs at least two distinct player identities from the group's games.
  const canMerge = distinctGamePlayers(games).length >= 2;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch {
      alert(t.error.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    run(() => addGroupMember(group.id, name));
  };

  const saveRename = (oldId: string) => {
    const name = editName.trim();
    setEditingId(null);
    if (!name || name.toLowerCase() === oldId) return;
    run(() => renameGroupMember(group.id, oldId, name));
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-display text-base font-semibold">
          {t.group.members}{" "}
          {members.length > 0 && (
            <span className="font-sans text-sm font-medium text-muted">· {members.length}</span>
          )}
        </p>
        {canMerge && (
          <button
            type="button"
            onClick={() => setMergeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-field hover:text-ink"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 3H5a2 2 0 0 0-2 2v3m0 8v3a2 2 0 0 0 2 2h3m8-18h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3" />
              <path d="M12 8v8m-4-4h8" />
            </svg>
            {t.group.mergeTitle}
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{t.group.membersEmpty}</p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-ink">
                {m.name.trim().charAt(0).toUpperCase()}
              </span>
              {editingId === m.id ? (
                <input
                  value={editName}
                  autoFocus
                  maxLength={40}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveRename(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(m.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-8 flex-1 rounded-lg border border-primary bg-field px-2.5 text-sm focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-sm font-medium">{m.name}</span>
              )}
              {editingId !== m.id && (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(m.id);
                      setEditName(m.name);
                    }}
                    aria-label={t.group.renameMember}
                    title={t.group.renameMember}
                    className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-40"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => removeGroupMember(group.id, m.id))}
                    aria-label={t.group.removeMember}
                    title={t.group.removeMember}
                    className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-danger disabled:opacity-40"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={newName}
          placeholder={t.group.addMemberPlaceholder}
          maxLength={40}
          onChange={(e) => setNewName(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-transparent bg-field px-3 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t.group.addMember}
        </button>
      </form>

      <MergePlayersModal
        group={group}
        games={games}
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onChanged={onChanged}
      />
    </Card>
  );
}

function SecretSettings({
  group,
  onChanged,
}: {
  group: GroupRow;
  onChanged: () => void;
}) {
  const enabled = !!group.secret;
  // Write-only: the current password is never shown (password-manager only), so
  // the field starts blank. Typing + saving sets a new one; saving blank clears.
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await setGroupSecret(group.id, value.trim() || null);
      setValue("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChanged();
    } catch {
      alert(t.error.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible summary={t.group.secretTitle}>
      <p className="text-xs text-muted">
        {enabled ? t.group.secretActiveHint : t.group.secretInactiveHint}
      </p>

      <form
        className="mt-3 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          value={value}
          type="password"
          autoComplete="new-password"
          placeholder={t.group.secretInputPlaceholder}
          maxLength={40}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="h-9 flex-1 rounded-lg border border-transparent bg-field px-3 text-sm text-ink focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saved ? t.group.secretSaved : t.group.secretSave}
        </button>
      </form>
      <p className="mt-1.5 text-xs text-muted">{t.group.secretFieldHint}</p>
    </Collapsible>
  );
}

function GamesList({ stats }: { stats: GroupStats }) {
  return (
    <Card className="p-5">
      <p className="mb-3 font-display text-base font-semibold">{t.group.games}</p>
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
