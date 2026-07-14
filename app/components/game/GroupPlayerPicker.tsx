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

  // Rows = roster ∪ any players already in the game (so stragglers can be
  // toggled off), keyed by normalized name.
  const byId = new Map<string, string>();
  for (const m of members) byId.set(m.id, m.name);
  for (const p of players) {
    const id = norm(p.name);
    if (id && !byId.has(id)) byId.set(id, p.name);
  }
  const rows = [...byId.entries()].map(([id, name]) => ({
    id,
    name,
    active: players.some((p) => norm(p.name) === id),
  }));

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
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => toggle(row.id, row.name, row.active)}
                aria-pressed={row.active}
                disabled={!row.active && full}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40",
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
