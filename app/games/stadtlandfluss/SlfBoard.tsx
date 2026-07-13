import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { cx } from "~/lib/cx";
import { t } from "~/i18n/de";
import { secureRandomIndex } from "~/lib/random";
import type { Player } from "~/lib/types";
import type { GameBoardProps } from "../types";
import { LetterReveal } from "./LetterReveal";
import {
  buildRound,
  chooseLetter,
  grandTotal,
  LETTERS,
  nextPoints,
  pointsFor,
  roundTotal,
  usedLetters,
  type SlfState,
} from "./logic";

const REVEAL_TICK_MS = 90;
const REVEAL_TICKS = 14;
const REVEAL_HOLD_MS = 900;

export function SlfBoard({
  game,
  state,
  players,
  setStateAt,
  mergeStateAt,
}: GameBoardProps<SlfState>) {
  const categories = state.settings.categories;
  const roundIndex = state.currentRound;
  const round = state.rounds?.[String(roundIndex)];

  const [tab, setTab] = useState<"current" | "totals">("current");

  // Big "drum roll" shown while a round's letter is drawn — purely a local
  // animation; the letter is already chosen and persisted before it starts.
  const [reveal, setReveal] = useState<{ letter: string; spinning: boolean } | null>(
    null,
  );
  const revealInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearInterval(revealInterval.current);
      clearTimeout(revealTimeout.current);
    },
    [],
  );
  const runReveal = (finalLetter: string) => {
    let ticks = 0;
    setReveal({ letter: LETTERS[secureRandomIndex(LETTERS.length)], spinning: true });
    revealInterval.current = setInterval(() => {
      ticks++;
      if (ticks >= REVEAL_TICKS) {
        clearInterval(revealInterval.current);
        setReveal({ letter: finalLetter, spinning: false });
        revealTimeout.current = setTimeout(() => setReveal(null), REVEAL_HOLD_MS);
        return;
      }
      setReveal({ letter: LETTERS[secureRandomIndex(LETTERS.length)], spinning: true });
    }, REVEAL_TICK_MS);
  };

  // Reveal round 1's letter once, the moment a freshly started game first
  // renders (nobody has answered yet) — the "opening ceremony" moment.
  const shownInitialReveal = useRef(false);
  useEffect(() => {
    if (shownInitialReveal.current || !round) return;
    if (
      roundIndex === 0 &&
      round.status === "writing" &&
      Object.keys(round.answers ?? {}).length === 0
    ) {
      shownInitialReveal.current = true;
      runReveal(round.letter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, round]);

  // Which player this device is — needed so everyone types their own words.
  const meKey = `spielzettel:me:${game.id}`;
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    setMeId(localStorage.getItem(meKey));
  }, [meKey]);
  const pickMe = (id: string) => {
    localStorage.setItem(meKey, id);
    setMeId(id);
  };
  const me = players.find((p) => p.id === meId) ?? null;

  // Own answers: local draft, saved debounced as one object.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const draftLoaded = useRef<string>("");
  useEffect(() => {
    const key = `${roundIndex}/${me?.id ?? ""}`;
    if (draftLoaded.current === key) return;
    draftLoaded.current = key;
    setDraft(me ? (round?.answers?.[me.id] ?? {}) : {});
  }, [roundIndex, me, round]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writeWord = (category: string, word: string) => {
    if (!me) return;
    const next = { ...draft, [category]: word };
    setDraft(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      mergeStateAt(["rounds", String(roundIndex), "answers"], {
        [me.id]: next,
      }).catch(() => {});
    }, 500);
  };

  const stop = () => {
    clearTimeout(saveTimer.current);
    if (me) {
      mergeStateAt(["rounds", String(roundIndex), "answers"], {
        [me.id]: draft,
      }).catch(() => {});
    }
    setStateAt(["rounds", String(roundIndex), "status"], "scoring").catch(() =>
      alert(t.error.saveFailed),
    );
  };

  const cyclePoints = (playerId: string, category: string) => {
    if (!round) return;
    const value = nextPoints(pointsFor(round, playerId, category));
    mergeStateAt(["rounds", String(roundIndex), "points"], {
      [`${playerId}:${category}`]: value,
    }).catch(() => {});
  };

  const finishScoring = () => {
    setStateAt(["rounds", String(roundIndex), "status"], "done").catch(() =>
      alert(t.error.saveFailed),
    );
  };

  const reopenRound = () => {
    setStateAt(["rounds", String(roundIndex), "status"], "scoring").catch(() =>
      alert(t.error.saveFailed),
    );
  };

  const startNextRound = async () => {
    const next = roundIndex + 1;
    const letter = chooseLetter(usedLetters(state), state.settings.excludedLetters ?? []);
    try {
      await mergeStateAt(
        ["rounds", String(next)],
        buildRound(letter) as unknown as Record<string, never>,
      );
      await setStateAt(["currentRound"], next);
      runReveal(letter);
    } catch {
      alert(t.error.saveFailed);
    }
  };

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
      {reveal && <LetterReveal letter={reveal.letter} spinning={reveal.spinning} />}

      <div className="mb-4 flex gap-1 rounded-xl bg-field p-1">
        {tabButton("current", t.rounds.currentTab)}
        {tabButton("totals", t.rounds.totalsTab)}
      </div>

      {tab === "totals" ? (
        <TotalsTable state={state} players={players} />
      ) : !round ? (
        <p className="py-8 text-center text-sm text-muted">
          {t.slf.waitingForRound}
        </p>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-surface p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              {t.rounds.round(roundIndex + 1)}
            </h2>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-ink shadow-sm">
              {round.letter}
            </span>
          </div>

          {round.status === "writing" && (
            <WritingPhase
              players={players}
              me={me}
              onPickMe={pickMe}
              letter={round.letter}
              categories={categories}
              draft={draft}
              onWrite={writeWord}
              onStop={stop}
            />
          )}

          {round.status !== "writing" && (
            <ScoringPhase
              players={players}
              categories={categories}
              round={round}
              done={round.status === "done"}
              onCycle={cyclePoints}
              onFinish={finishScoring}
              onReopen={reopenRound}
              onNextRound={startNextRound}
            />
          )}
        </div>
      )}
    </div>
  );
}

function WritingPhase({
  players,
  me,
  onPickMe,
  letter,
  categories,
  draft,
  onWrite,
  onStop,
}: {
  players: Player[];
  me: Player | null;
  onPickMe: (id: string) => void;
  letter: string;
  categories: string[];
  draft: Record<string, string>;
  onWrite: (category: string, word: string) => void;
  onStop: () => void;
}) {
  return (
    <div>
      <div className="mb-5">
        <p className="mb-2 text-sm font-medium">{t.slf.iAm}</p>
        {!me && <p className="mb-2 text-xs text-muted">{t.slf.iAmHint}</p>}
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPickMe(p.id)}
              aria-pressed={me?.id === p.id}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                me?.id === p.id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted hover:bg-field",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {me && (
        <>
          <p className="mb-3 text-sm text-muted">{t.slf.writingHint(letter)}</p>
          <div className="space-y-3">
            {categories.map((category) => (
              <label key={category} className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                  {category}
                </span>
                <Input
                  value={draft[category] ?? ""}
                  placeholder={`${letter}…`}
                  autoCapitalize="words"
                  onChange={(e) => onWrite(category, e.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            {t.slf.othersHidden}
          </p>
        </>
      )}

      <Button variant="accent" size="lg" className="mt-5 w-full" onClick={onStop}>
        {t.slf.stop}
      </Button>
    </div>
  );
}

function ScoringPhase({
  players,
  categories,
  round,
  done,
  onCycle,
  onFinish,
  onReopen,
  onNextRound,
}: {
  players: Player[];
  categories: string[];
  round: NonNullable<SlfState["rounds"][string]>;
  done: boolean;
  onCycle: (playerId: string, category: string) => void;
  onFinish: () => void;
  onReopen: () => void;
  onNextRound: () => void;
}) {
  return (
    <div>
      {!done && <p className="mb-3 text-sm text-muted">{t.slf.scoringHint}</p>}
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full min-w-[22rem] border-collapse text-center">
          <thead>
            <tr className="border-b border-border/60 bg-field/60">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.slf.categoriesLabel}
              </th>
              {players.map((p) => (
                <th key={p.id} className="min-w-24 px-2 py-2.5">
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
            {categories.map((category) => (
              <tr key={category} className="border-b border-border/40">
                <td className="whitespace-nowrap px-3 py-2 text-left text-sm font-medium">
                  {category}
                </td>
                {players.map((p) => {
                  const word = round.answers?.[p.id]?.[category]?.trim();
                  const points = pointsFor(round, p.id, category);
                  return (
                    <td key={p.id} className="p-1">
                      <button
                        type="button"
                        onClick={() => onCycle(p.id, category)}
                        disabled={done}
                        className={cx(
                          "flex w-full flex-col items-center rounded-lg px-2 py-1.5 transition-colors",
                          !done && "hover:bg-field",
                        )}
                      >
                        <span
                          className={cx(
                            "max-w-28 truncate text-sm",
                            word ? "font-medium" : "text-muted/60",
                          )}
                        >
                          {word || t.slf.noAnswer}
                        </span>
                        <span
                          className={cx(
                            "text-xs font-semibold",
                            points > 0 ? "text-primary" : "text-muted/70",
                          )}
                        >
                          {points} {t.modal.points}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-field">
              <td className="px-3 py-2.5 text-left font-display text-sm font-semibold">
                {t.rounds.total}
              </td>
              {players.map((p) => (
                <td key={p.id} className="px-2 py-2.5 font-display text-sm font-semibold">
                  {roundTotal(round, p.id, categories)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2.5">
        {done ? (
          <>
            <Button size="lg" className="w-full" onClick={onNextRound}>
              {t.slf.newRound}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted"
              onClick={onReopen}
            >
              {t.slf.reopenRound}
            </Button>
          </>
        ) : (
          <Button size="lg" className="w-full" onClick={onFinish}>
            {t.slf.scoreRound}
          </Button>
        )}
      </div>
    </div>
  );
}

function TotalsTable({
  state,
  players,
}: {
  state: SlfState;
  players: Player[];
}) {
  const rounds = Object.entries(state.rounds ?? {})
    .filter(([, r]) => r.status === "done")
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="overflow-x-auto rounded-3xl border border-border/60 bg-surface shadow-sm">
      <table className="w-full min-w-[22rem] border-collapse text-center">
        <thead>
          <tr className="border-b border-border/60">
            <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.length === 0 && (
            <tr>
              <td colSpan={players.length + 1} className="px-4 py-6 text-sm text-muted">
                {t.slf.waitingForRound}
              </td>
            </tr>
          )}
          {rounds.map(([index, round]) => (
            <tr key={index} className="border-b border-border/40">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-4 py-2.5 text-left text-sm font-medium">
                {t.rounds.round(Number(index) + 1)}{" "}
                <span className="font-mono text-xs text-muted">
                  {round.letter}
                </span>
              </td>
              {players.map((p) => (
                <td key={p.id} className="px-3 py-2.5 text-sm">
                  {roundTotal(round, p.id, state.settings.categories)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border/60 bg-field">
            <td className="sticky left-0 z-10 bg-field px-4 py-3 text-left font-display text-base font-semibold">
              {t.rounds.total}
            </td>
            {players.map((p) => (
              <td key={p.id} className="px-3 py-3 font-display text-base font-semibold">
                {grandTotal(state, p.id)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
