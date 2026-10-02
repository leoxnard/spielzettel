import { Card } from "~/components/ui/Card";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { Player } from "~/lib/types";
import { dartLabel, formatAverage } from "./format";
import { BULL, CRICKET_TARGETS, type CricketResult, type X01Result } from "./logic";

function PlayerDot({ player }: { player: Player }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: player.color }}
    />
  );
}

export function X01Scoreboard({
  players,
  result,
  currentId,
}: {
  players: Player[];
  result: X01Result;
  currentId?: string;
}) {
  return (
    <Card className="divide-y divide-border/60 overflow-hidden">
      {players.map((p) => {
        const st = result.stats[p.id];
        const last = st.lastTurn;
        const lastText = !last
          ? t.darts.emptySlot
          : last.result.bust
            ? t.darts.bust
            : last.turn.darts.length > 0
              ? last.turn.darts.map(dartLabel).join(" · ")
              : `+${last.result.scored}`;
        return (
          <div
            key={p.id}
            className={cx(
              "flex items-center gap-3 px-4 py-3",
              p.id === currentId && "bg-primary-soft",
              p.id === result.winnerId && "bg-accent-soft",
            )}
          >
            <PlayerDot player={p} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold">
                {p.name}
              </p>
              <p className="truncate text-xs text-muted tabular-nums">
                {t.darts.average} {formatAverage(st.average)} ·{" "}
                {st.dartsThrown} {t.darts.dartsThrown} · {t.darts.lastTurn}{" "}
                <span className={cx(last?.result.bust && "text-danger")}>
                  {lastText}
                </span>
              </p>
            </div>
            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
              {st.remaining}
            </p>
          </div>
        );
      })}
    </Card>
  );
}

/** Cricket marks: / (1), X (2), circled X (3 = closed). */
function Mark({ count }: { count: number }) {
  const n = Math.min(3, count);
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      role="img"
      aria-label={t.darts.marks(n)}
      className={cx("mx-auto", n >= 3 ? "text-primary" : "text-ink")}
    >
      {n >= 1 && <path d="M6 18 18 6" />}
      {n >= 2 && <path d="M6 6l12 12" />}
      {n >= 3 && <circle cx="12" cy="12" r="10" />}
    </svg>
  );
}

export function CricketScoreboard({
  players,
  result,
  currentId,
}: {
  players: Player[];
  result: CricketResult;
  currentId?: string;
}) {
  const colClass = (id: string) =>
    cx(
      id === currentId && "bg-primary-soft",
      id === result.winnerId && "bg-accent-soft",
    );
  return (
    <Card className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.darts.target}
            </th>
            {players.map((p) => (
              <th key={p.id} className={cx("min-w-16 px-2 py-2.5", colClass(p.id))}>
                <span className="flex items-center justify-center gap-1.5">
                  <PlayerDot player={p} />
                  <span className="max-w-20 truncate font-display font-semibold">
                    {p.name}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRICKET_TARGETS.map((n) => (
            <tr key={n} className="border-b border-border/40">
              <th className="px-3 py-1.5 text-left font-display text-base font-semibold tabular-nums">
                {n === BULL ? t.darts.bull : n}
              </th>
              {players.map((p) => (
                <td key={p.id} className={cx("px-2 py-1.5 text-center", colClass(p.id))}>
                  <Mark count={result.stats[p.id].marks[n] ?? 0} />
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-field">
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.darts.points}
            </th>
            {players.map((p) => (
              <td
                key={p.id}
                className={cx(
                  "px-2 py-2.5 text-center font-display text-xl font-semibold tabular-nums",
                  colClass(p.id),
                )}
              >
                {result.stats[p.id].points}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
