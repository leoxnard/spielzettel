import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { BaseSettings } from "../types";
import { completedEntries } from "../rounds/engine";
import { defineRoundsGame } from "../rounds/defineRoundsGame";
import { MiniStepper } from "../rounds/MiniStepper";
import {
  hasFinished,
  phaseOf,
  phase10RoundScore,
  type Phase10Entry,
} from "./scoring";

function Phase10Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
      <path d="m3 12.5 9 4.5 9-4.5M3 17l9 4.5 9-4.5" />
    </svg>
  );
}

export const phase10Definition = defineRoundsGame<Phase10Entry, BaseSettings>(
  {
    slug: "phase10",
    name: t.phase10.name,
    description: t.phase10.description,
    icon: <Phase10Icon />,
    iconClass: "bg-[#2f9e69] text-white",
    minPlayers: 2,
    maxPlayers: 6,
    lobbySubtitle: t.phase10.subtitle,
    boardTitle: t.phase10.boardTitle,
    howItWorks: t.phase10.howItWorks,
    defaultSettings: {},
  },
  {
    emptyEntry: { points: null, done: false },
    isEntryComplete: (e) => e.points !== null,
    allowEmptyEntries: true,
    roundScore: (e) => phase10RoundScore(e),
    turnChip: "starter",
    playerMeta: (playerId, state) =>
      t.phase10.phase(phaseOf(completedEntries(state, playerId))),
    verdict: ({ state, totals, players }) => {
      const finished = players.filter((p) =>
        hasFinished(completedEntries(state, p.id)),
      );
      if (finished.length === 0) return { over: false, winnerIds: [] };
      const best = Math.min(...finished.map((p) => totals[p.id]));
      return {
        over: true,
        winnerIds: finished.filter((p) => totals[p.id] === best).map((p) => p.id),
        reason: t.phase10.phase(10),
      };
    },
    EntryEditor: ({ player, value, onChange }) => {
      const entry = value ?? { points: null, done: false };
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...entry, done: !entry.done })}
            aria-pressed={entry.done}
            className={cx(
              "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              entry.done
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted hover:bg-field",
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t.phase10.phaseDone}
          </button>
          <MiniStepper
            value={entry.points}
            onChange={(points) => onChange({ ...entry, points })}
            min={0}
            max={400}
            label={`${t.rounds.points} ${player.name}`}
          />
        </div>
      );
    },
  },
);
