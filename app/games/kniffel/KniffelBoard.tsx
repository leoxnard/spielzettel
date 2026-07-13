import { useEffect, useState } from "react";

import { Modal } from "~/components/ui/Modal";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { Player } from "~/lib/types";
import type { GameBoardProps } from "../types";
import {
  bonus,
  grandTotal,
  playerScores,
  upperComplete,
  upperSubtotal,
} from "./scoring";
import {
  LOWER_CATEGORIES,
  UPPER_CATEGORIES,
  type CategoryDef,
  type KniffelState,
} from "./types";
import { FixedScoreModal } from "./modals/FixedScoreModal";
import { SumInputModal } from "./modals/SumInputModal";
import { UpperSectionModal } from "./modals/UpperSectionModal";

interface ActiveCell {
  def: CategoryDef;
  player: Player;
}

export function KniffelBoard({
  state,
  players,
  setStateAt,
}: GameBoardProps<KniffelState>) {
  const [active, setActive] = useState<ActiveCell | null>(null);
  // Optimistic overlay per cell, keyed "playerId/category". Entries are
  // dropped as soon as the live state confirms them.
  const [pending, setPending] = useState<Record<string, number | null>>({});

  useEffect(() => {
    setPending((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next)) {
        const [playerId, category] = key.split("/");
        const server = playerScores(state, playerId)[
          category as CategoryDef["id"]
        ];
        const confirmed =
          next[key] === null ? server === undefined : server === next[key];
        if (confirmed) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [state]);

  const scoreOf = (player: Player, category: CategoryDef["id"]) => {
    const key = `${player.id}/${category}`;
    if (key in pending) return pending[key] ?? undefined;
    return playerScores(state, player.id)[category];
  };

  const effectiveScores = (player: Player) => {
    const merged = { ...playerScores(state, player.id) };
    for (const [key, value] of Object.entries(pending)) {
      const [playerId, category] = key.split("/");
      if (playerId !== player.id) continue;
      if (value === null) delete merged[category as CategoryDef["id"]];
      else merged[category as CategoryDef["id"]] = value;
    }
    return merged;
  };

  const write = (player: Player, def: CategoryDef, value: number | null) => {
    const key = `${player.id}/${def.id}`;
    setPending((prev) => ({ ...prev, [key]: value }));
    setActive(null);
    setStateAt(["scores", player.id, def.id], value).catch(() => {
      setPending((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      alert(t.error.saveFailed);
    });
  };

  const labelCell =
    "sticky left-0 z-10 bg-surface px-4 py-3 text-left text-sm font-medium whitespace-nowrap";
  const sectionRow =
    "sticky left-0 z-10 bg-field px-4 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-primary";

  const activeCurrent = active
    ? scoreOf(active.player, active.def.id)
    : undefined;

  return (
    <div>
      <div className="overflow-x-auto rounded-3xl border border-border/60 bg-surface shadow-sm">
        <table className="w-full min-w-[26rem] border-collapse text-center">
          <thead>
            <tr className="border-b border-border/60">
              <th className={cx(labelCell, "text-[11px] font-semibold uppercase tracking-wider text-muted")}>
                {t.kniffel.category}
              </th>
              {players.map((p) => (
                <th key={p.id} className="min-w-24 px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-field">
              <td className={sectionRow} colSpan={players.length + 1}>
                {t.kniffel.upperSection}
              </td>
            </tr>
            {UPPER_CATEGORIES.map((def) => (
              <CategoryRow
                key={def.id}
                def={def}
                players={players}
                scoreOf={scoreOf}
                onOpen={(player) => setActive({ def, player })}
                labelCell={labelCell}
              />
            ))}
            <ComputedRow
              label={t.kniffel.subtotal}
              players={players}
              value={(p) => String(upperSubtotal(effectiveScores(p)))}
              labelCell={labelCell}
            />
            <ComputedRow
              label={t.kniffel.bonus}
              players={players}
              value={(p) => {
                const scores = effectiveScores(p);
                if (bonus(scores) > 0) return "+35";
                return upperComplete(scores) ? "0" : "–";
              }}
              labelCell={labelCell}
            />
            <tr className="bg-field">
              <td className={sectionRow} colSpan={players.length + 1}>
                {t.kniffel.lowerSection}
              </td>
            </tr>
            {LOWER_CATEGORIES.map((def) => (
              <CategoryRow
                key={def.id}
                def={def}
                players={players}
                scoreOf={scoreOf}
                onOpen={(player) => setActive({ def, player })}
                labelCell={labelCell}
              />
            ))}
            <tr className="border-t border-border/60 bg-field">
              <td className={cx(labelCell, "bg-field font-display text-base font-semibold")}>
                {t.kniffel.total}
              </td>
              {players.map((p) => (
                <td key={p.id} className="px-3 py-3 font-display text-base font-semibold">
                  {grandTotal(effectiveScores(p))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-center text-xs text-muted">
        {t.game.boardHint}
      </p>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={active ? t.kniffel.categories[active.def.id].label : ""}
        subtitle={
          active
            ? `${active.player.name} · ${t.kniffel.categories[active.def.id].hint}`
            : undefined
        }
      >
        {active?.def.kind === "upper" && (
          <UpperSectionModal
            key={`${active.player.id}/${active.def.id}`}
            def={active.def}
            current={activeCurrent}
            onSubmit={(points) => write(active.player, active.def, points)}
            onClear={
              activeCurrent !== undefined
                ? () => write(active.player, active.def, null)
                : undefined
            }
          />
        )}
        {active?.def.kind === "sum" && (
          <SumInputModal
            key={`${active.player.id}/${active.def.id}`}
            def={active.def}
            current={activeCurrent}
            onSubmit={(points) => write(active.player, active.def, points)}
            onClear={
              activeCurrent !== undefined
                ? () => write(active.player, active.def, null)
                : undefined
            }
          />
        )}
        {active?.def.kind === "fixed" && (
          <FixedScoreModal
            def={active.def}
            onSubmit={(points) => write(active.player, active.def, points)}
            onClear={
              activeCurrent !== undefined
                ? () => write(active.player, active.def, null)
                : undefined
            }
          />
        )}
      </Modal>
    </div>
  );
}

function CategoryRow({
  def,
  players,
  scoreOf,
  onOpen,
  labelCell,
}: {
  def: CategoryDef;
  players: Player[];
  scoreOf: (player: Player, category: CategoryDef["id"]) => number | undefined;
  onOpen: (player: Player) => void;
  labelCell: string;
}) {
  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className={labelCell}>{t.kniffel.categories[def.id].label}</td>
      {players.map((p) => {
        const value = scoreOf(p, def.id);
        return (
          <td key={p.id} className="p-0">
            <button
              type="button"
              onClick={() => onOpen(p)}
              aria-label={`${t.kniffel.categories[def.id].label} – ${p.name}`}
              className={cx(
                "flex h-12 w-full items-center justify-center text-sm transition-colors hover:bg-primary-soft/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                value === undefined
                  ? "text-muted/50"
                  : value === 0
                    ? "text-muted"
                    : "font-semibold",
              )}
            >
              {value === undefined ? "+" : value === 0 ? "–" : value}
            </button>
          </td>
        );
      })}
    </tr>
  );
}

function ComputedRow({
  label,
  players,
  value,
  labelCell,
}: {
  label: string;
  players: Player[];
  value: (player: Player) => string;
  labelCell: string;
}) {
  return (
    <tr className="border-b border-border/40 bg-field/60">
      <td className={cx(labelCell, "bg-field/60 text-[11px] font-semibold uppercase tracking-wider text-muted")}>
        {label}
      </td>
      {players.map((p) => (
        <td key={p.id} className="px-3 py-2.5 text-sm font-medium">
          {value(p)}
        </td>
      ))}
    </tr>
  );
}
