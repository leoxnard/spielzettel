import { useEffect, useRef, useState } from "react";

import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import type { GameDefinition } from "../types";
import {
  grandTotal,
  LETTERS,
  newRound,
  type SlfSettings,
  type SlfState,
} from "./logic";
import { SlfBoard } from "./SlfBoard";

function SlfIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * Both editors below keep a local copy of the list they're editing rather
 * than deriving straight from `settings` (which only updates once the
 * server round-trip lands). Without that, rapid taps/keystrokes each
 * compute their next value from the same stale base and the slower
 * writes clobber each other — the same class of bug fixed for player
 * renames via merge_player. Here it's simpler: just don't resync from the
 * server while the host is actively editing.
 */

function CategoryEditor({
  settings,
  patchSettings,
}: {
  settings: SlfSettings;
  patchSettings: (patch: Partial<SlfSettings>) => void;
}) {
  const [categories, setCategories] = useState(settings.categories);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setCategories(settings.categories);
  }, [settings.categories]);

  // Functional updater so several changes queued in the same React batch
  // (e.g. rapid taps) each build on the previous one instead of all
  // computing from the same stale `categories` closure. The network write
  // itself is debounced so a burst of edits sends one request with the
  // final array instead of several that can land out of order.
  const patchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commit = (updater: (prev: string[]) => string[]) => {
    dirty.current = true;
    setCategories((prev) => {
      const next = updater(prev);
      clearTimeout(patchTimer.current);
      patchTimer.current = setTimeout(
        () => patchSettings({ categories: next }),
        300,
      );
      return next;
    });
  };
  const rename = (i: number, value: string) =>
    commit((prev) => prev.map((c, idx) => (idx === i ? value : c)));
  const remove = (i: number) => commit((prev) => prev.filter((_, idx) => idx !== i));
  const add = () => commit((prev) => [...prev, ""]);

  return (
    <div>
      <label className="mb-1.5 block text-sm">
        {t.slf.categoriesLabel}{" "}
        <span className="text-xs text-muted">{t.slf.categoriesHint}</span>
      </label>
      <ul className="space-y-2">
        {categories.map((category, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              value={category}
              placeholder={t.slf.categoryPlaceholder}
              maxLength={30}
              onChange={(e) => rename(i, e.target.value)}
              className="h-11 w-full rounded-xl bg-field px-4 text-sm focus:border-primary focus:outline-none border border-transparent"
            />
            {categories.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={t.slf.removeCategory}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-field hover:text-danger"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted transition-colors hover:border-primary hover:text-primary"
      >
        <span aria-hidden>+</span> {t.slf.addCategory}
      </button>
    </div>
  );
}

function LetterEditor({
  settings,
  patchSettings,
}: {
  settings: SlfSettings;
  patchSettings: (patch: Partial<SlfSettings>) => void;
}) {
  const [excluded, setExcluded] = useState(settings.excludedLetters ?? []);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setExcluded(settings.excludedLetters ?? []);
  }, [settings.excludedLetters]);

  // Debounced for the same reason as CategoryEditor's commit: a burst of
  // taps should send one request with the final set, not several that can
  // resolve out of order and clobber each other.
  const patchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toggle = (letter: string) => {
    dirty.current = true;
    setExcluded((prev) => {
      const next = prev.includes(letter)
        ? prev.filter((l) => l !== letter)
        : [...prev, letter];
      clearTimeout(patchTimer.current);
      patchTimer.current = setTimeout(
        () => patchSettings({ excludedLetters: next }),
        300,
      );
      return next;
    });
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm">{t.slf.lettersLabel}</label>
      <p className="mb-3 text-xs text-muted">
        {excluded.length >= LETTERS.length
          ? t.slf.lettersAllExcludedHint
          : t.slf.lettersHint}
      </p>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
        {LETTERS.map((letter) => {
          const isExcluded = excluded.includes(letter);
          return (
            <button
              key={letter}
              type="button"
              onClick={() => toggle(letter)}
              aria-pressed={!isExcluded}
              className={cx(
                "flex h-9 items-center justify-center rounded-lg border font-display text-sm font-semibold transition-colors",
                isExcluded
                  ? "border-border text-muted/40 line-through"
                  : "border-border bg-field text-ink hover:border-primary",
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const slfDefinition: GameDefinition<SlfState, SlfSettings> = {
  slug: "stadtlandfluss",
  name: t.slf.name,
  description: t.slf.description,
  icon: <SlfIcon />,
  iconClass: "bg-[#3f7bd9] text-white",
  minPlayers: 2,
  maxPlayers: 6,
  lobbySubtitle: t.slf.subtitle,
  boardTitle: t.slf.boardTitle,
  howItWorks: [
    "Jede Runde bekommt einen zufälligen Buchstaben – alle tippen ihre Antworten auf dem eigenen Gerät.",
    "Wer fertig ist, drückt Stopp. Dann werden alle Antworten aufgedeckt.",
    "Punkte pro Antwort antippen: 0 → 5 → 10 → 20 (Vorschlag: 10 für jede gültige Antwort).",
    "„Runde werten“ schließt die Runde ab, danach geht’s mit neuem Buchstaben weiter.",
  ],
  defaultSettings: { categories: [...t.slf.defaultCategories], excludedLetters: [] },
  SettingsPanel: ({ settings, patchSettings }) => (
    <div className="space-y-6">
      <CategoryEditor settings={settings} patchSettings={patchSettings} />
      <LetterEditor settings={settings} patchSettings={patchSettings} />
    </div>
  ),
  hasStarted: (state) => "rounds" in state,
  createInitialState: (_players, settings) => ({
    settings,
    rounds: { "0": newRound([], settings.excludedLetters ?? []) },
    currentRound: 0,
  }),
  mergeStateForPlayers: (state) => state,
  getStatusLine: (state) => {
    const round = state.rounds?.[String(state.currentRound)];
    return round
      ? `${t.rounds.round(state.currentRound + 1)} · ${t.slf.letter} ${round.letter}`
      : t.rounds.round(state.currentRound + 1);
  },
  getWinnerIds: (state, players) => {
    const hasScored = Object.values(state.rounds ?? {}).some(
      (r) => r.status === "done",
    );
    if (!hasScored || players.length === 0) return [];
    const totalOf = (id: string) => grandTotal(state, id);
    const best = Math.max(...players.map((p) => totalOf(p.id)));
    return players.filter((p) => totalOf(p.id) === best).map((p) => p.id);
  },
  Board: SlfBoard,
};
