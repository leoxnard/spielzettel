import type { Player } from "~/lib/types";
import type {
  Dart,
  DartsMode,
  DartsSettings,
  DartsState,
  Multiplier,
  Turn,
  X01Start,
} from "./types";

export const X01_STARTS: readonly X01Start[] = [301, 501, 701];
export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const;
export const DARTS_PER_TURN = 3;
export const MAX_TURN_TOTAL = 180;
export const BULL = 25;

export interface ResolvedSettings {
  mode: DartsMode;
  start: X01Start;
  doubleOut: boolean;
  doubleIn: boolean;
  startPlayerId?: string;
}

export const DEFAULT_SETTINGS: ResolvedSettings = {
  mode: "x01",
  start: 501,
  doubleOut: true,
  doubleIn: false,
};

export function resolveSettings(s: DartsSettings | undefined): ResolvedSettings {
  return {
    mode: s?.mode === "cricket" ? "cricket" : "x01",
    start: X01_STARTS.includes(s?.start as X01Start)
      ? (s?.start as X01Start)
      : DEFAULT_SETTINGS.start,
    doubleOut: s?.doubleOut ?? DEFAULT_SETTINGS.doubleOut,
    doubleIn: s?.doubleIn ?? DEFAULT_SETTINGS.doubleIn,
    startPlayerId: s?.startPlayerId,
  };
}

export function dartValue(d: Dart): number {
  return d.segment * d.multiplier;
}

export function isValidDart(d: Dart): boolean {
  if (d.segment === 0) return true;
  if (d.segment === BULL) return d.multiplier !== 3;
  return d.segment >= 1 && d.segment <= 20 && [1, 2, 3].includes(d.multiplier);
}

// --- Turns & rotation ------------------------------------------------------

/** Committed turns in throw order, limited to players still in the game. */
export function orderedTurns(state: DartsState, players: Player[]): Turn[] {
  const ids = new Set(players.map((p) => p.id));
  return Object.entries(state.turns ?? {})
    .filter(([, turn]) => turn && ids.has(turn.playerId))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, turn]) => turn);
}

/** Index under which the next turn is stored (one past the highest key). */
export function nextTurnIndex(state: DartsState): number {
  const keys = Object.keys(state.turns ?? {})
    .filter((k) => state.turns?.[k])
    .map(Number)
    .filter((n) => Number.isInteger(n));
  return keys.length === 0 ? 0 : Math.max(...keys) + 1;
}

/** Key of the most recent committed turn, if any. */
export function lastTurnIndex(state: DartsState): number | undefined {
  const next = nextTurnIndex(state);
  return next === 0 ? undefined : next - 1;
}

/**
 * Who throws next: the lobby's start player first, then whoever follows the
 * last thrower in list order (robust against players joining mid-game).
 */
export function currentPlayer(
  players: Player[],
  settings: ResolvedSettings,
  turns: Turn[],
): Player | undefined {
  if (players.length === 0) return undefined;
  const last = turns[turns.length - 1];
  if (!last) {
    return players.find((p) => p.id === settings.startPlayerId) ?? players[0];
  }
  const i = players.findIndex((p) => p.id === last.playerId);
  return players[(i + 1) % players.length];
}

/** 1-based round number (one visit per player per round). */
export function roundNumber(turns: Turn[], players: Player[]): number {
  if (players.length === 0) return 1;
  return Math.floor(turns.length / players.length) + 1;
}

// --- X01 -------------------------------------------------------------------

export interface X01TurnResult {
  /** Remaining after the turn (unchanged on bust). */
  remaining: number;
  opened: boolean;
  /** Points that counted (0 on bust). */
  scored: number;
  bust: boolean;
  checkout: boolean;
  /** Darts that count for the average: all three unless checked out. */
  dartsThrown: number;
}

export function applyX01Turn(
  remaining: number,
  opened: boolean,
  turn: Turn,
  s: ResolvedSettings,
): X01TurnResult {
  const bustResult: X01TurnResult = {
    remaining,
    opened,
    scored: 0,
    bust: true,
    checkout: false,
    dartsThrown: DARTS_PER_TURN,
  };

  // Quick entry: only the 3-dart total is known.
  if (turn.darts.length === 0) {
    const total = Math.max(0, Math.min(MAX_TURN_TOTAL, turn.total ?? 0));
    const nowOpen = opened || total > 0;
    const counted = nowOpen ? total : 0;
    const left = remaining - counted;
    if (left < 0 || (s.doubleOut && left === 1)) return bustResult;
    return {
      remaining: left,
      opened: nowOpen,
      scored: counted,
      bust: false,
      checkout: left === 0,
      dartsThrown: DARTS_PER_TURN,
    };
  }

  let left = remaining;
  let open = opened;
  for (let i = 0; i < turn.darts.length; i++) {
    const d = turn.darts[i];
    const value = dartValue(d);
    if (!open) {
      if (value === 0 || (s.doubleIn && d.multiplier !== 2)) continue;
      open = true;
    }
    const next = left - value;
    if (
      next < 0 ||
      (s.doubleOut && next === 1) ||
      (s.doubleOut && next === 0 && d.multiplier !== 2)
    ) {
      return bustResult;
    }
    left = next;
    if (left === 0) {
      return {
        remaining: 0,
        opened: true,
        scored: remaining,
        bust: false,
        checkout: true,
        dartsThrown: i + 1,
      };
    }
  }
  return {
    remaining: left,
    opened: open,
    scored: remaining - left,
    bust: false,
    checkout: false,
    dartsThrown: DARTS_PER_TURN,
  };
}

export interface X01PlayerStats {
  remaining: number;
  opened: boolean;
  dartsThrown: number;
  /** Points per 3 darts; null before the first turn. */
  average: number | null;
  lastTurn?: { turn: Turn; result: X01TurnResult };
}

export interface X01Result {
  stats: Record<string, X01PlayerStats>;
  winnerId?: string;
}

export function computeX01(
  players: Player[],
  s: ResolvedSettings,
  turns: Turn[],
): X01Result {
  const stats: Record<string, X01PlayerStats> = Object.fromEntries(
    players.map((p) => [
      p.id,
      { remaining: s.start, opened: !s.doubleIn, dartsThrown: 0, average: null },
    ]),
  );
  let winnerId: string | undefined;
  for (const turn of turns) {
    const st = stats[turn.playerId];
    if (!st) continue;
    const result = applyX01Turn(st.remaining, st.opened, turn, s);
    st.remaining = result.remaining;
    st.opened = result.opened;
    st.dartsThrown += result.dartsThrown;
    st.lastTurn = { turn, result };
    if (result.checkout) {
      winnerId = turn.playerId;
      break;
    }
  }
  for (const st of Object.values(stats)) {
    st.average =
      st.dartsThrown === 0
        ? null
        : ((s.start - st.remaining) / st.dartsThrown) * DARTS_PER_TURN;
  }
  return { stats, winnerId };
}

// --- Checkout suggestions --------------------------------------------------

/** Finishing doubles, most popular first; bull last. */
const DOUBLE_PREFERENCE = [
  20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, BULL,
];

/** Setup darts tried first for 3-dart routes: trebles high→low, bulls, singles. */
const SETUP_DARTS: Dart[] = [
  ...Array.from({ length: 20 }, (_, i) => ({
    segment: 20 - i,
    multiplier: 3 as Multiplier,
  })),
  { segment: BULL, multiplier: 1 },
  { segment: BULL, multiplier: 2 },
  ...Array.from({ length: 20 }, (_, i) => ({
    segment: 20 - i,
    multiplier: 1 as Multiplier,
  })),
];

/** A single dart scoring exactly `value`, preferring singles, then trebles. */
function dartFor(value: number): Dart | null {
  if (value >= 1 && value <= 20) return { segment: value, multiplier: 1 };
  if (value <= 60 && value % 3 === 0) return { segment: value / 3, multiplier: 3 };
  if (value === BULL) return { segment: BULL, multiplier: 1 };
  if (value === 2 * BULL) return { segment: BULL, multiplier: 2 };
  if (value <= 40 && value % 2 === 0) return { segment: value / 2, multiplier: 2 };
  return null;
}

function finishFor(value: number, doubleOut: boolean): Dart | null {
  if (!doubleOut) return dartFor(value);
  if (value === 2 * BULL) return { segment: BULL, multiplier: 2 };
  if (value >= 2 && value <= 40 && value % 2 === 0) {
    return { segment: value / 2, multiplier: 2 };
  }
  return null;
}

function twoDartFinish(value: number, doubleOut: boolean): Dart[] | null {
  const finishes: Dart[] = doubleOut
    ? DOUBLE_PREFERENCE.map((n) => ({ segment: n, multiplier: 2 as Multiplier }))
    : [...SETUP_DARTS, ...DOUBLE_PREFERENCE.map((n) => ({ segment: n, multiplier: 2 as Multiplier }))];
  for (const fin of finishes) {
    const rest = value - dartValue(fin);
    if (rest < 1) continue;
    const first = dartFor(rest);
    if (first) return [first, fin];
  }
  return null;
}

/**
 * Suggested finishing route for `remaining` with `dartsLeft` darts (fewest
 * darts first). Null when there is none — e.g. the bogey numbers 159, 162,
 * 163, 165, 166, 168, 169 or anything above 170.
 */
export function checkoutSuggestion(
  remaining: number,
  dartsLeft: number,
  doubleOut: boolean,
): Dart[] | null {
  if (remaining < 1 || dartsLeft < 1) return null;
  const one = finishFor(remaining, doubleOut);
  if (one) return [one];
  if (dartsLeft < 2) return null;
  const two = twoDartFinish(remaining, doubleOut);
  if (two) return two;
  if (dartsLeft < 3) return null;
  for (const setup of SETUP_DARTS) {
    const rest = remaining - dartValue(setup);
    if (rest < 2) continue;
    const route = twoDartFinish(rest, doubleOut);
    if (route) return [setup, ...route];
  }
  return null;
}

// --- Cricket ---------------------------------------------------------------

export interface CricketPlayerStats {
  /** Marks per target (capped at 3 = closed). */
  marks: Record<number, number>;
  points: number;
}

export interface CricketResult {
  stats: Record<string, CricketPlayerStats>;
  winnerId?: string;
}

export function isCricketTarget(segment: number): boolean {
  return (CRICKET_TARGETS as readonly number[]).includes(segment);
}

export function closedCount(st: CricketPlayerStats): number {
  return CRICKET_TARGETS.filter((n) => (st.marks[n] ?? 0) >= 3).length;
}

export function computeCricket(players: Player[], turns: Turn[]): CricketResult {
  const stats: Record<string, CricketPlayerStats> = Object.fromEntries(
    players.map((p) => [
      p.id,
      {
        marks: Object.fromEntries(CRICKET_TARGETS.map((n) => [n, 0])),
        points: 0,
      },
    ]),
  );
  let winnerId: string | undefined;
  for (const turn of turns) {
    const me = stats[turn.playerId];
    if (!me) continue;
    for (const d of turn.darts) {
      if (!isCricketTarget(d.segment) || d.multiplier < 1) continue;
      const hits = Math.min(d.multiplier, d.segment === BULL ? 2 : 3);
      const have = me.marks[d.segment] ?? 0;
      const closing = Math.min(hits, 3 - have);
      me.marks[d.segment] = have + Math.max(0, closing);
      const extra = hits - Math.max(0, closing);
      const someoneOpen = players.some(
        (p) => p.id !== turn.playerId && (stats[p.id].marks[d.segment] ?? 0) < 3,
      );
      if (extra > 0 && someoneOpen) me.points += extra * d.segment;
    }
    if (isCricketWinner(turn.playerId, stats)) {
      winnerId = turn.playerId;
      break;
    }
  }
  return { stats, winnerId };
}

function isCricketWinner(
  playerId: string,
  stats: Record<string, CricketPlayerStats>,
): boolean {
  const me = stats[playerId];
  if (closedCount(me) < CRICKET_TARGETS.length) return false;
  return Object.entries(stats).every(
    ([id, st]) => id === playerId || me.points >= st.points,
  );
}

// --- Game-level helpers ----------------------------------------------------

export interface DartsEvaluation {
  settings: ResolvedSettings;
  turns: Turn[];
  x01?: X01Result;
  cricket?: CricketResult;
  winnerId?: string;
}

/** Evaluates the whole game; `draft` previews an uncommitted turn on top. */
export function evaluate(
  state: DartsState,
  players: Player[],
  draft?: Turn,
): DartsEvaluation {
  const settings = resolveSettings(state.settings);
  const turns = orderedTurns(state, players);
  const all = draft ? [...turns, draft] : turns;
  if (settings.mode === "cricket") {
    const cricket = computeCricket(players, all);
    return { settings, turns, cricket, winnerId: cricket.winnerId };
  }
  const x01 = computeX01(players, settings, all);
  return { settings, turns, x01, winnerId: x01.winnerId };
}

/** True when a turn in progress has to end now (3 darts, bust, win). */
export function turnIsOver(
  state: DartsState,
  players: Player[],
  draft: Turn,
): boolean {
  if (draft.darts.length >= DARTS_PER_TURN) return true;
  const preview = evaluate(state, players, draft);
  if (preview.winnerId) return true;
  return !!preview.x01?.stats[draft.playerId]?.lastTurn?.result.bust;
}

/** Final winner if decided, otherwise the current leader(s). */
export function winnerIds(state: DartsState, players: Player[]): string[] {
  const ev = evaluate(state, players);
  if (ev.winnerId) return [ev.winnerId];
  if (ev.turns.length === 0) return [];
  if (ev.cricket) {
    const st = ev.cricket.stats;
    const key = (id: string) => st[id].points * 100 + closedCount(st[id]);
    const best = Math.max(...players.map((p) => key(p.id)));
    return players.filter((p) => key(p.id) === best).map((p) => p.id);
  }
  const st = ev.x01!.stats;
  const best = Math.min(...players.map((p) => st[p.id].remaining));
  return players.filter((p) => st[p.id].remaining === best).map((p) => p.id);
}
