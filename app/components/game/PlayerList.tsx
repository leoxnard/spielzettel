import { useEffect, useRef, useState } from "react";

import { Input } from "~/components/ui/Input";
import { t } from "~/i18n/de";
import { PLAYER_COLORS, type Player } from "~/lib/types";

interface PlayerListProps {
  players: Player[];
  minPlayers: number;
  maxPlayers: number;
  /** Structural changes: add, remove, reorder (whole array). */
  onChange: (players: Player[]) => void;
  /** Per-player edits (name, color) — merged atomically server-side. */
  onPatchPlayer: (id: string, patch: Partial<Pick<Player, "name" | "color">>) => void;
}

export function newPlayer(index: number): Player {
  return {
    id: crypto.randomUUID(),
    name: "",
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
  };
}

export function PlayerList({
  players,
  minPlayers,
  maxPlayers,
  onChange,
  onPatchPlayer,
}: PlayerListProps) {
  const cycleColor = (player: Player) => {
    const i = PLAYER_COLORS.indexOf(
      player.color as (typeof PLAYER_COLORS)[number],
    );
    onPatchPlayer(player.id, {
      color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
    });
  };

  const remove = (id: string) => onChange(players.filter((p) => p.id !== id));

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= players.length) return;
    const next = [...players];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{t.lobby.playersLabel}</span>
        <span className="text-xs text-muted">
          {players.length} / {maxPlayers}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">{t.lobby.playersHint}</p>
      <ul className="space-y-2.5">
        {players.map((player, index) => (
          <PlayerRow
            key={player.id}
            player={player}
            index={index}
            count={players.length}
            removable={players.length > minPlayers}
            onRename={(name) => onPatchPlayer(player.id, { name })}
            onCycleColor={() => cycleColor(player)}
            onRemove={() => remove(player.id)}
            onMove={(delta) => move(index, delta)}
          />
        ))}
      </ul>
      {players.length < maxPlayers && (
        <button
          type="button"
          onClick={() => onChange([...players, newPlayer(players.length)])}
          className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <span aria-hidden>+</span> {t.lobby.addPlayer}
        </button>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  index,
  count,
  removable,
  onRename,
  onCycleColor,
  onRemove,
  onMove,
}: {
  player: Player;
  index: number;
  count: number;
  removable: boolean;
  onRename: (name: string) => void;
  onCycleColor: () => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  // Optimistic local draft: what we show wins until the server confirms our
  // own edit. `pending` holds the value we've typed but not yet seen echoed
  // back, so a slow save or a stale realtime payload can't yank the name back
  // to an old value. Only once the server matches (or we have no local edit)
  // do we accept the server's value — that keeps other devices' renames live.
  const [draft, setDraft] = useState(player.name);
  const pending = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (pending.current !== null && player.name === pending.current) {
      pending.current = null;
    }
    if (pending.current === null) setDraft(player.name);
  }, [player.name]);

  const save = (value: string) => {
    clearTimeout(saveTimer.current);
    onRename(value);
  };

  const onType = (value: string) => {
    setDraft(value);
    pending.current = value;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onRename(value), 400);
  };

  const arrow =
    "flex h-4 w-5 items-center justify-center rounded text-muted transition-colors hover:text-ink disabled:opacity-25 disabled:pointer-events-none";

  return (
    <li className="flex items-center gap-2">
      <span className="flex flex-col">
        <button
          type="button"
          className={arrow}
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={t.lobby.moveUp}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          className={arrow}
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label={t.lobby.moveDown}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </span>
      <button
        type="button"
        onClick={onCycleColor}
        aria-label={`${t.lobby.playersHint} (${index + 1})`}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
        style={{ backgroundColor: player.color }}
      >
        {index + 1}
      </button>
      <Input
        value={draft}
        placeholder={`${t.lobby.playerPlaceholder} ${index + 1}`}
        maxLength={24}
        onBlur={() => save(draft)}
        onChange={(e) => onType(e.target.value)}
      />
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.lobby.removePlayer}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-field hover:text-danger"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </li>
  );
}
