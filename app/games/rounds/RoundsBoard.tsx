import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/Button";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { Json, Player } from "~/lib/types";
import type { BaseSettings, GameBoardProps } from "../types";
import {
  entryAt,
  starterForRound,
  totals as computeTotals,
  verdictOf,
} from "./engine";
import type { RoundsConfig, RoundsState } from "./types";

type Props<E extends Json, S extends BaseSettings> = GameBoardProps<
  RoundsState<E, S>
> & {
  config: RoundsConfig<E, S>;
};

export function RoundsBoard<E extends Json, S extends BaseSettings>({
  state,
  players,
  setStateAt,
  mergeStateAt,
  config,
  onNewGame,
}: Props<E, S>) {
  const round = state.currentRound;
  const maxRounds = config.maxRounds?.(players, state.settings) ?? null;
  const roundsDone = maxRounds !== null && round >= maxRounds;

  const verdict = verdictOf(state, config, players);
  const [tab, setTab] = useState<"current" | "totals">(
    verdict.over || roundsDone ? "totals" : "current",
  );

  // Optimistic overlay keyed "round/playerId", cleared once the server
  // state carries the same entry.
  const [pending, setPending] = useState<Record<string, E>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Revert redo state
  const [revertedRound, setRevertedRound] = useState<{
    roundIndex: number;
    data: Record<string, E>;
  } | null>(null);

  useEffect(() => {
    setPending((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next)) {
        const [r, pid] = key.split("/");
        const server = entryAt(state, Number(r), pid);
        if (JSON.stringify(server) === JSON.stringify(next[key])) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [state]);

  const entryOf = (playerId: string, r: number): E | undefined => {
    const key = `${r}/${playerId}`;
    return key in pending ? pending[key] : entryAt(state, r, playerId);
  };

  const writeEntry = (playerId: string, entry: E) => {
    const key = `${round}/${playerId}`;
    setPending((prev) => ({ ...prev, [key]: entry }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      mergeStateAt(["rounds", String(round)], { [playerId]: entry }).catch(
        () => {
          setPending((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        },
      );
    }, 450);
  };

  const allComplete = players.every((p) => {
    const e = entryOf(p.id, round);
    if (e === undefined) {
      return config.allowEmptyEntries ?? false;
    }
    return config.isEntryComplete(e);
  });

  const currentHasEntries = players.some(
    (p) => entryOf(p.id, round) !== undefined,
  );

  // Flush all pending entries immediately
  const flushPending = async () => {
    const keys = Object.keys(pending);
    for (const key of keys) {
      const [r, pid] = key.split("/");
      const entry = pending[key];
      clearTimeout(timers.current[key]);
      try {
        await mergeStateAt(["rounds", String(r)], { [pid]: entry });
      } catch {
        // Ignore errors, they'll be handled by the finishRound catch
      }
    }
    setPending({});
  };

  const finishRound = async () => {
    // First flush all pending entries
    await flushPending();

    try {
      await setStateAt(["currentRound"], round + 1);
    } catch {
      alert(t.error.saveFailed);
    }
  };

  const revertRound = async () => {
    try {
      // Capture current round entries BEFORE reverting (for Issue 7)
      const currentEntries: Record<string, E> = {};
      for (const player of players) {
        const entry = entryOf(player.id, round);
        if (entry !== undefined) currentEntries[player.id] = entry;
      }

      // Also capture previous round if we're reverting that one
      let revertedRoundIndex = round;
      let revertedData = currentEntries;

      if (currentHasEntries) {
        // Reverting current round (which has entries)
        await setStateAt(["rounds", String(round)], null);
      } else if (round > 0) {
        // Reverting previous round (current is empty)
        revertedRoundIndex = round - 1;
        for (const player of players) {
          const entry = entryAt(state, round - 1, player.id);
          if (entry !== undefined) revertedData[player.id] = entry;
        }
        await setStateAt(["rounds", String(round - 1)], null);
        await setStateAt(["currentRound"], round - 1);
      }

      // Store for redo toast
      if (Object.keys(revertedData).length > 0) {
        setRevertedRound({ roundIndex: revertedRoundIndex, data: revertedData });
        // Auto-dismiss after 5 seconds
        setTimeout(() => setRevertedRound(null), 5000);
      }
    } catch {
      alert(t.error.saveFailed);
    }
  };

  const redoRevert = async () => {
    if (!revertedRound) return;
    try {
      await mergeStateAt(
        ["rounds", String(revertedRound.roundIndex)],
        revertedRound.data,
      );
      setRevertedRound(null);
    } catch {
      alert(t.error.saveFailed);
    }
  };

  const totals = computeTotals(state, config, players);
  const starter = starterForRound(players, state.settings, round);
  const roundWarning = config.roundWarning?.({
    entries: Object.fromEntries(players.map((p) => [p.id, entryOf(p.id, round)])),
    players,
    roundIndex: round,
    settings: state.settings,
  });
  const playedRounds = state.currentRound;

  const tabButton = (id: "current" | "totals", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={cx(
        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        tab === id ? "bg-surface text-ink shadow-sm" : "text-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      {verdict.over && <WinnerBanner verdict={verdict} players={players} onNewGame={onNewGame} />}

      <div className="mb-4 flex gap-1 rounded-xl bg-field p-1">
        {tabButton("current", t.rounds.currentTab)}
        {tabButton("totals", t.rounds.totalsTab)}
      </div>

      {tab === "current" ? (
        <div className="rounded-3xl border border-border/60 bg-surface p-5 shadow-sm">
          {roundsDone ? (
            <p className="py-6 text-center text-sm text-muted">
              {t.rounds.allRoundsPlayed}
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">
                  {config.roundTitle?.(round, players, state.settings) ??
                    t.rounds.round(round + 1)}
                </h2>
                {config.turnChip && starter && state.settings.showTurnOrder && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-field px-3 py-1.5 text-xs font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: starter.color }}
                    />
                    {config.turnChip === "dealer"
                      ? t.rounds.dealer(starter.name)
                      : t.rounds.starter(starter.name)}
                  </span>
                )}
              </div>

              <ul className="divide-y divide-border/40">
                {players.map((player) => {
                  const entry = entryOf(player.id, round);
                  const complete =
                    entry !== undefined && config.isEntryComplete(entry);
                  return (
                    <li
                      key={player.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
                    >
                      <span className="flex min-w-28 items-center gap-2 text-sm font-medium">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: player.color }}
                        />
                        {player.name}
                        {complete && (
                          <span className="text-xs font-semibold text-primary">
                            {t.rounds.roundPreview(config.roundScore(entry, round))}
                          </span>
                        )}
                      </span>
                      <config.EntryEditor
                        player={player}
                        value={entry}
                        onChange={(value) => writeEntry(player.id, value)}
                        roundIndex={round}
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 space-y-2.5">
                {roundWarning && (
                  <p className="flex items-start gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-ink">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-accent"
                      aria-hidden
                    >
                      <path d="M12 9v4m0 4h.01M10.3 3.9 2.5 17.5A1.5 1.5 0 0 0 3.8 20h16.4a1.5 1.5 0 0 0 1.3-2.5L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z" />
                    </svg>
                    {roundWarning}
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={finishRound}
                  disabled={!allComplete}
                >
                  {t.rounds.finishRound}
                </Button>
                {!allComplete && (
                  <p className="text-center text-xs text-muted">
                    {t.rounds.fillAllHint}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <TotalsTable
          state={state}
          config={config}
          players={players}
          totals={totals}
          playedRounds={playedRounds}
          onRevertRound={revertRound}
          revertedRound={revertedRound}
          onRedoRevert={redoRevert}
          mergeStateAt={mergeStateAt}
        />
      )}

      {revertedRound && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-sheet-in">
          <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
            <span className="text-sm text-muted">{t.rounds.redoRevert}</span>
            <Button variant="ghost" size="sm" onClick={redoRevert}>
              {t.rounds.undoRevert}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WinnerBanner({
  verdict,
  players,
  onNewGame,
}: {
  verdict: { winnerIds: string[]; reason?: string };
  players: Player[];
  onNewGame?: () => void;
}) {
  const names = players
    .filter((p) => verdict.winnerIds.includes(p.id))
    .map((p) => p.name)
    .join(" & ");
  return (
    <div className="mb-4 rounded-3xl border border-accent/40 bg-accent-soft p-5 text-center animate-fade-in-up">
      <p className="font-display text-xl font-semibold">
        🏆{" "}
        {verdict.winnerIds.length > 1
          ? t.rounds.winners(names)
          : t.rounds.winner(names)}
      </p>
      {verdict.reason && (
        <p className="mt-1 text-sm text-muted">{verdict.reason}</p>
      )}
      {onNewGame && (
        <Button
          variant="accent"
          size="sm"
          className="mt-4"
          onClick={onNewGame}
        >
          {t.rounds.newGame}
        </Button>
      )}
    </div>
  );
}

function TotalsTable<E extends Json, S extends BaseSettings>({
  state,
  config,
  players,
  totals,
  playedRounds,
  onRevertRound,
  revertedRound,
  onRedoRevert,
  mergeStateAt,
}: {
  state: RoundsState<E, S>;
  config: RoundsConfig<E, S>;
  players: Player[];
  totals: Record<string, number>;
  playedRounds: number;
  onRevertRound: () => void;
  revertedRound: { roundIndex: number; data: Record<string, E> } | null;
  onRedoRevert: () => void;
  mergeStateAt: (path: string[], value: Record<string, Json | null>) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const labelCell =
    "sticky left-0 z-10 bg-surface px-4 py-2.5 text-left text-sm font-medium whitespace-nowrap";

  const handleEditEntry = (roundIndex: number, playerId: string, value: E) => {
    mergeStateAt(["rounds", String(roundIndex)], { [playerId]: value as Json }).catch(
      () => alert(t.error.saveFailed),
    );
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-border/60 bg-surface shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
        <span className="text-sm font-medium">{t.rounds.totalsTab}</span>
        {playedRounds > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode((m) => !m)}
          >
            {editMode ? t.rounds.editDone : t.rounds.editMode}
          </Button>
        )}
      </div>
      <table className="w-full min-w-[22rem] border-collapse text-center">
        <thead>
          <tr className="border-b border-border/60">
            <th className={cx(labelCell, "py-3 text-[11px] font-semibold uppercase tracking-wider text-muted")}>
              {t.rounds.totalsTab}
            </th>
            {players.map((p) => (
              <th key={p.id} className="min-w-20 px-3 py-3">
                <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </span>
                {config.playerMeta && (
                  <span className="mt-0.5 block text-[11px] font-medium text-muted">
                    {config.playerMeta(p.id, state)}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {playedRounds === 0 && (
            <tr>
              <td
                colSpan={players.length + 1}
                className="px-4 py-6 text-sm text-muted"
              >
                {t.rounds.fillAllHint}
              </td>
            </tr>
          )}
          {Array.from({ length: playedRounds }, (_, i) => (
            <tr key={i} className="border-b border-border/40">
              <td className={labelCell}>{t.rounds.round(i + 1)}</td>
              {players.map((p) => {
                const entry = entryAt(state, i, p.id);
                return (
                  <td key={p.id} className="px-3 py-2.5 text-sm">
                    {editMode ? (
                      <div className="flex justify-center">
                        <config.EntryEditor
                          player={p}
                          value={entry}
                          onChange={(value) => handleEditEntry(i, p.id, value)}
                          roundIndex={i}
                        />
                      </div>
                    ) : (
                      <>{entry === undefined ? "–" : config.roundScore(entry, i)}</>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-border/60 bg-field">
            <td className={cx(labelCell, "bg-field font-display text-base font-semibold")}>
              {t.rounds.total}
            </td>
            {players.map((p) => (
              <td
                key={p.id}
                className="px-3 py-3 font-display text-base font-semibold"
              >
                {totals[p.id]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {playedRounds > 0 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted"
            onClick={onRevertRound}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
            {t.rounds.revertRound}
          </Button>
        </div>
      )}
    </div>
  );
}