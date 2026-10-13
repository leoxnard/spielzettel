import { useState } from "react";

import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import { addGroupMember } from "~/lib/group-api";
import { PLAYER_COLORS, type GroupRow, type Player } from "~/lib/types";

const norm = (s: string) => s.trim().toLowerCase();

interface GroupPlayerPickerProps {
  group: GroupRow;
  players: Player[];
  maxPlayers: number;
  onChange: (players: Player[]) => void;
}

/**
 * Player selection for group games: instead of typing free-form names, you
 * pick from the group's roster. A field adds a brand-new name to the group
 * (and to this game). Whether a member "plays" is derived by name from the
 * game's player list, so it stays in sync across devices.
 */
export function GroupPlayerPicker({
  group,
  players,
  maxPlayers,
  onChange,
}: GroupPlayerPickerProps) {
  const [members, setMembers] = useState(group.members);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // Rows = the game's players in seat order (reorderable), then the rest of
  // the roster. Keyed by normalized name.
  const activeIds = new Set(players.map((p) => norm(p.name)));
  const rows = [
    ...players.map((p) => ({ id: norm(p.name), name: p.name, active: true })),
    ...members
      .filter((m) => !activeIds.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, active: false })),
  ];

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= players.length) return;
    const next = [...players];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const arrow =
    "flex h-4 w-5 items-center justify-center rounded text-muted transition-colors hover:text-ink disabled:opacity-25 disabled:pointer-events-none";

  const count = players.length;
  const full = count >= maxPlayers;

  const addPlayer = (name: string) =>
    onChange([
      ...players,
      {
        id: crypto.randomUUID(),
        name,
        color: PLAYER_COLORS[players.length % PLAYER_COLORS.length],
      },
    ]);

  const toggle = (id: string, name: string, active: boolean) => {
    if (active) onChange(players.filter((p) => norm(p.name) !== id));
    else if (!full) addPlayer(name);
  };

  const addNew = async () => {
    const name = draft.trim();
    if (!name || busy) return;
    const id = norm(name);
    setBusy(true);
    try {
      const g = await addGroupMember(group.id, name);
      setMembers(g.members);
      setDraft("");
      if (!players.some((p) => norm(p.name) === id) && !full) addPlayer(name);
    } catch {
      alert(t.error.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{t.lobby.pickPlayers}</span>
        <span className="text-xs text-muted">
          {count} / {maxPlayers}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">{t.lobby.pickPlayersHint}</p>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2">
              {row.active ? (
                <span className="flex flex-col">
                  <button
                    type="button"
                    className={arrow}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`${row.name}: ${t.lobby.moveUp}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={arrow}
                    onClick={() => move(index, 1)}
                    disabled={index === count - 1}
                    aria-label={`${row.name}: ${t.lobby.moveDown}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </span>
              ) : (
                <span className="w-5 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => toggle(row.id, row.name, row.active)}
                aria-pressed={row.active}
                disabled={!row.active && full}
                className={cx(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40",
                  row.active
                    ? "border-primary bg-primary-soft/50 font-medium"
                    : "border-border hover:bg-field",
                )}
              >
                <span
                  className={cx(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    row.active
                      ? "border-primary bg-primary text-primary-ink"
                      : "border-border",
                  )}
                >
                  {row.active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{row.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-2.5 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          addNew();
        }}
      >
        <input
          value={draft}
          placeholder={t.lobby.addToGroup}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          className="h-11 flex-1 rounded-xl border border-dashed border-border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-medium text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label={t.lobby.addToGroup}
        >
          +
        </button>
      </form>
    </div>
  );
}
