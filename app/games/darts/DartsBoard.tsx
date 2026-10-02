import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { NumericKeypad } from "~/components/ui/NumericKeypad";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { Json, Player } from "~/lib/types";
import type { GameBoardProps } from "../types";
import { DartPad } from "./DartPad";
import { dartLabel } from "./format";
import {
  checkoutSuggestion,
  currentPlayer,
  DARTS_PER_TURN,
  evaluate,
  lastTurnIndex,
  MAX_TURN_TOTAL,
  nextTurnIndex,
  turnIsOver,
} from "./logic";
import { CricketScoreboard, X01Scoreboard } from "./Scoreboards";
import type { Dart, DartsState, Turn } from "./types";

type InputMode = "darts" | "total";

function turnToJson(turn: Turn): Json {
  return {
    playerId: turn.playerId,
    darts: turn.darts.map((d) => ({ segment: d.segment, multiplier: d.multiplier })),
    ...(turn.total !== undefined ? { total: turn.total } : {}),
  };
}

/**
 * Darts board. Committed turns come from `state` only — the host overlays
 * our writes optimistically. The dart-by-dart draft of the visit in
 * progress is local to this device until it's committed as one turn.
 */
export function DartsBoard({
  state,
  players,
  setStateAt,
  onNewGame,
  onGameOver,
  onReopen,
  game,
}: GameBoardProps<DartsState>) {
  const [draft, setDraft] = useState<Turn | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("darts");
  const [total, setTotal] = useState<number | null>(null);

  const ev = evaluate(state, players);
  const s = ev.settings;
  const current = currentPlayer(players, s, ev.turns);
  const winnerId = ev.winnerId;

  // A draft only belongs to whoever is up now (another device may have
  // committed meanwhile).
  const draftDarts = draft && current && draft.playerId === current.id ? draft.darts : [];
  const preview =
    current && draftDarts.length > 0
      ? evaluate(state, players, { playerId: current.id, darts: draftDarts })
      : ev;

  const gameOverCalled = useRef(false);
  useEffect(() => {
    if (winnerId && !gameOverCalled.current) {
      gameOverCalled.current = true;
      onGameOver?.();
    }
    if (!winnerId) gameOverCalled.current = false;
  }, [winnerId, onGameOver]);

  const commit = (turn: Turn) => {
    setStateAt(["turns", String(nextTurnIndex(state))], turnToJson(turn)).catch(
      () => {},
    );
    setDraft(null);
    setTotal(null);
  };

  const addDart = (dart: Dart) => {
    if (!current || winnerId) return;
    const next: Turn = { playerId: current.id, darts: [...draftDarts, dart] };
    if (turnIsOver(state, players, next)) commit(next);
    else setDraft(next);
  };

  const lastIndex = lastTurnIndex(state);
  const canUndo = draftDarts.length > 0 || lastIndex !== undefined;

  /** Removes the last dart — reopening the previous visit if needed. */
  const undo = () => {
    if (current && draftDarts.length > 0) {
      setDraft({ playerId: current.id, darts: draftDarts.slice(0, -1) });
      return;
    }
    if (lastIndex === undefined) return;
    const last = state.turns?.[String(lastIndex)];
    setStateAt(["turns", String(lastIndex)], null).catch(() => {});
    setDraft(
      last && last.darts.length > 0
        ? { playerId: last.playerId, darts: last.darts.slice(0, -1) }
        : null,
    );
  };

  const winner = players.find((p) => p.id === winnerId);

  return (
    <div className="space-y-4">
      {winner && (
        <WinnerBanner
          winner={winner}
          reason={s.mode === "cricket" ? t.darts.reasonCricket : t.darts.reasonX01}
          onUndo={() => {
            if (game.status === "finished") onReopen?.().catch(() => {});
            undo();
          }}
          onNewGame={onNewGame}
        />
      )}

      {current && !winner && (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: current.color }}
              />
              <p className="truncate font-display text-lg font-semibold">
                {t.darts.toThrow(current.name)}
              </p>
            </div>
            <CurrentScore
              ev={preview}
              playerId={current.id}
              dartsLeft={DARTS_PER_TURN - draftDarts.length}
            />
          </div>

          {s.mode === "x01" && (
            <div className="mt-3 flex max-w-80 gap-1 rounded-xl bg-field p-1">
              {(["darts", "total"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={inputMode === m}
                  onClick={() => {
                    setInputMode(m);
                    setDraft(null);
                  }}
                  className={cx(
                    "h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
                    inputMode === m ? "bg-surface text-ink shadow-sm" : "text-muted",
                  )}
                >
                  {m === "darts" ? t.darts.inputDarts : t.darts.inputTotal}
                </button>
              ))}
            </div>
          )}

          {s.mode === "x01" && inputMode === "total" ? (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm">{t.darts.totalLabel}</label>
              <div className="flex items-center gap-2">
                <NumericKeypad
                  value={total}
                  onChange={setTotal}
                  min={0}
                  max={MAX_TURN_TOTAL}
                  label={t.darts.totalLabel}
                  className="w-28"
                />
                <Button
                  onClick={() => commit({ playerId: current.id, darts: [], total: total ?? 0 })}
                  disabled={total === null}
                >
                  {t.darts.enterTotal}
                </Button>
                <Button variant="ghost" onClick={undo} disabled={lastIndex === undefined}>
                  {t.darts.undo}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">{t.darts.totalHint}</p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2">
                {Array.from({ length: DARTS_PER_TURN }, (_, i) => {
                  const d = draftDarts[i];
                  return (
                    <span
                      key={i}
                      className={cx(
                        "flex h-11 min-w-0 flex-1 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                        d ? "bg-primary-soft text-primary" : "border border-dashed border-border text-muted",
                      )}
                    >
                      {d ? dartLabel(d) : t.darts.emptySlot}
                    </span>
                  );
                })}
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => commit({ playerId: current.id, darts: draftDarts })}
                >
                  {t.darts.commitTurn}
                </Button>
              </div>
              <div className="mt-4">
                <DartPad mode={s.mode} onDart={addDart} onUndo={undo} canUndo={canUndo} />
              </div>
            </>
          )}
        </Card>
      )}

      {ev.x01 && (
        <X01Scoreboard
          players={players}
          result={ev.x01}
          currentId={winner ? undefined : current?.id}
        />
      )}
      {ev.cricket && (
        <CricketScoreboard
          players={players}
          result={preview.cricket ?? ev.cricket}
          currentId={winner ? undefined : current?.id}
        />
      )}
    </div>
  );
}

function CurrentScore({
  ev,
  playerId,
  dartsLeft,
}: {
  ev: ReturnType<typeof evaluate>;
  playerId: string;
  dartsLeft: number;
}) {
  if (ev.cricket) {
    return (
      <div className="text-right">
        <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
          {ev.cricket.stats[playerId]?.points ?? 0}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t.darts.points}
        </p>
      </div>
    );
  }
  const st = ev.x01?.stats[playerId];
  if (!st) return null;
  const route =
    st.opened && st.remaining <= 170
      ? checkoutSuggestion(st.remaining, dartsLeft, ev.settings.doubleOut)
      : null;
  return (
    <div className="text-right">
      <p className="font-display text-4xl font-semibold tracking-tight tabular-nums">
        {st.remaining}
      </p>
      <p className="text-xs text-muted">
        {!st.opened ? (
          t.darts.needsDouble
        ) : route ? (
          <>
            {t.darts.checkout}:{" "}
            <span className="font-semibold text-primary">
              {route.map(dartLabel).join(" · ")}
            </span>
          </>
        ) : st.remaining <= 170 ? (
          t.darts.noCheckout
        ) : (
          t.darts.remaining
        )}
      </p>
    </div>
  );
}

function WinnerBanner({
  winner,
  reason,
  onUndo,
  onNewGame,
}: {
  winner: Player;
  reason: string;
  onUndo: () => void;
  onNewGame?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-accent/40 bg-accent-soft p-5 text-center animate-fade-in-up">
      <p className="font-display text-xl font-semibold">
        🏆 {t.darts.winner(winner.name)}
      </p>
      <p className="mt-1 text-sm text-muted">{reason}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={onUndo}>
          {t.darts.undo}
        </Button>
        {onNewGame && (
          <Button variant="accent" onClick={onNewGame}>
            {t.darts.newGame}
          </Button>
        )}
      </div>
    </div>
  );
}
