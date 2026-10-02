import { describe, expect, it } from "vitest";

import type { Player } from "~/lib/types";
import {
  applyX01Turn,
  checkoutSuggestion,
  computeCricket,
  computeX01,
  currentPlayer,
  dartValue,
  evaluate,
  nextTurnIndex,
  resolveSettings,
  turnIsOver,
  winnerIds,
} from "./logic";
import type { Dart, DartsSettings, DartsState, Turn } from "./types";

const players: Player[] = [
  { id: "a", name: "Anna", color: "red" },
  { id: "b", name: "Ben", color: "blue" },
];

const S = (n: number): Dart => ({ segment: n, multiplier: 1 });
const D = (n: number): Dart => ({ segment: n, multiplier: 2 });
const T = (n: number): Dart => ({ segment: n, multiplier: 3 });
const MISS: Dart = { segment: 0, multiplier: 1 };

const turn = (playerId: string, ...darts: Dart[]): Turn => ({ playerId, darts });

function stateOf(settings: DartsSettings, turns: Turn[]): DartsState {
  return {
    settings,
    turns: Object.fromEntries(turns.map((t, i) => [String(i), t])),
  };
}

const x01 = resolveSettings({});

describe("settings", () => {
  it("defaults to 501 double out", () => {
    expect(x01).toMatchObject({
      mode: "x01",
      start: 501,
      doubleOut: true,
      doubleIn: false,
    });
  });
  it("rejects unknown start values", () => {
    expect(resolveSettings({ start: 123 as never }).start).toBe(501);
  });
});

describe("applyX01Turn", () => {
  it("subtracts a normal visit", () => {
    const r = applyX01Turn(501, true, turn("a", T(20), T(20), T(20)), x01);
    expect(r).toMatchObject({ remaining: 321, scored: 180, bust: false });
  });

  it("busts below zero and resets to the start of the turn", () => {
    const r = applyX01Turn(40, true, turn("a", S(20), T(20)), x01);
    expect(r).toMatchObject({ remaining: 40, scored: 0, bust: true });
  });

  it("busts on 1 left with double out", () => {
    const r = applyX01Turn(41, true, turn("a", S(20), S(20)), x01);
    expect(r.bust).toBe(true);
    expect(r.remaining).toBe(41);
  });

  it("allows 1 left without double out", () => {
    const s = resolveSettings({ doubleOut: false });
    const r = applyX01Turn(41, true, turn("a", S(20), S(20)), s);
    expect(r).toMatchObject({ remaining: 1, bust: false });
  });

  it("busts when reaching 0 without a double", () => {
    const r = applyX01Turn(20, true, turn("a", S(20)), x01);
    expect(r.bust).toBe(true);
  });

  it("checks out on a double and counts only darts used", () => {
    const r = applyX01Turn(100, true, turn("a", T(20), D(20)), x01);
    expect(r).toMatchObject({ remaining: 0, checkout: true, dartsThrown: 2 });
  });

  it("checks out on bull", () => {
    const r = applyX01Turn(50, true, turn("a", D(25)), x01);
    expect(r.checkout).toBe(true);
  });

  it("checks out on a single without double out", () => {
    const s = resolveSettings({ doubleOut: false });
    expect(applyX01Turn(20, true, turn("a", S(20)), s).checkout).toBe(true);
  });

  it("double in: nothing counts before the first double", () => {
    const s = resolveSettings({ doubleIn: true });
    const r = applyX01Turn(501, false, turn("a", T(20), D(10), S(5)), s);
    expect(r).toMatchObject({ remaining: 476, opened: true, scored: 25 });
  });

  it("double in: stays closed without a double", () => {
    const s = resolveSettings({ doubleIn: true });
    const r = applyX01Turn(501, false, turn("a", T(20), S(20), S(1)), s);
    expect(r).toMatchObject({ remaining: 501, opened: false, bust: false });
  });

  it("double in: bull double opens", () => {
    const s = resolveSettings({ doubleIn: true });
    const r = applyX01Turn(501, false, turn("a", D(25)), s);
    expect(r).toMatchObject({ remaining: 451, opened: true });
  });

  it("quick total entry subtracts and busts", () => {
    expect(
      applyX01Turn(501, true, { playerId: "a", darts: [], total: 140 }, x01)
        .remaining,
    ).toBe(361);
    expect(
      applyX01Turn(100, true, { playerId: "a", darts: [], total: 140 }, x01)
        .bust,
    ).toBe(true);
    expect(
      applyX01Turn(100, true, { playerId: "a", darts: [], total: 100 }, x01)
        .checkout,
    ).toBe(true);
  });
});

describe("computeX01", () => {
  it("tracks remaining, average and darts; detects the winner", () => {
    const turns = [
      turn("a", T(20), T(20), T(20)), // 121 left of 301
      turn("b", S(20), S(20), S(20)),
      turn("a", T(20), T(7), D(20)), // 121 → 0
    ];
    const s = resolveSettings({ start: 301 });
    const r = computeX01(players, s, turns);
    expect(r.winnerId).toBe("a");
    expect(r.stats.a.remaining).toBe(0);
    expect(r.stats.a.dartsThrown).toBe(6);
    expect(r.stats.a.average).toBeCloseTo(150.5);
    expect(r.stats.b.remaining).toBe(241);
    expect(r.stats.b.average).toBe(60);
  });

  it("bust darts count towards the average", () => {
    const s = resolveSettings({ start: 301 });
    const r = computeX01(players, s, [turn("a", T(20), T(20), T(20)), turn("b", MISS), turn("a", T(20), T(20), S(1))]);
    expect(r.stats.a.remaining).toBe(121);
    expect(r.stats.a.dartsThrown).toBe(6);
  });
});

describe("rotation", () => {
  it("starts with the start player and follows list order", () => {
    const s = resolveSettings({ startPlayerId: "b" });
    expect(currentPlayer(players, s, [])?.id).toBe("b");
    expect(currentPlayer(players, s, [turn("b", MISS)])?.id).toBe("a");
    expect(currentPlayer(players, s, [turn("b", MISS), turn("a", MISS)])?.id).toBe("b");
  });

  it("next index skips cleared turns and gaps", () => {
    expect(nextTurnIndex({ settings: {}, turns: {} })).toBe(0);
    expect(
      nextTurnIndex({
        settings: {},
        turns: { "0": turn("a"), "1": turn("b") },
      }),
    ).toBe(2);
  });
});

describe("checkoutSuggestion", () => {
  const sum = (ds: Dart[] | null) => (ds ?? []).reduce((n, d) => n + dartValue(d), 0);

  it("finds the classic 170", () => {
    expect(checkoutSuggestion(170, 3, true)).toEqual([T(20), T(20), D(25)]);
  });

  it("returns null for bogey numbers", () => {
    for (const n of [159, 162, 163, 165, 166, 168, 169, 171, 200]) {
      expect(checkoutSuggestion(n, 3, true)).toBeNull();
    }
  });

  it("finds a route ending on a double for every other value up to 170", () => {
    const bogeys = new Set([159, 162, 163, 165, 166, 168, 169]);
    for (let n = 2; n <= 170; n++) {
      if (bogeys.has(n)) continue;
      const route = checkoutSuggestion(n, 3, true);
      expect(route, `no route for ${n}`).not.toBeNull();
      expect(sum(route)).toBe(n);
      expect(route![route!.length - 1].multiplier).toBe(2);
    }
  });

  it("prefers fewest darts", () => {
    expect(checkoutSuggestion(40, 3, true)).toEqual([D(20)]);
    expect(checkoutSuggestion(100, 3, true)).toEqual([T(20), D(20)]);
  });

  it("respects darts left", () => {
    expect(checkoutSuggestion(100, 1, true)).toBeNull();
    expect(checkoutSuggestion(121, 2, true)).toBeNull();
  });

  it("no route for 1 with double out", () => {
    expect(checkoutSuggestion(1, 3, true)).toBeNull();
  });

  it("single finishes without double out", () => {
    expect(checkoutSuggestion(19, 1, false)).toEqual([S(19)]);
    expect(sum(checkoutSuggestion(177, 3, false))).toBe(177);
  });
});

describe("cricket", () => {
  it("counts marks and caps at 3", () => {
    const r = computeCricket(players, [turn("a", T(20), S(19), D(25))]);
    expect(r.stats.a.marks[20]).toBe(3);
    expect(r.stats.a.marks[19]).toBe(1);
    expect(r.stats.a.marks[25]).toBe(2);
    expect(r.stats.a.points).toBe(0);
  });

  it("ignores non-targets", () => {
    const r = computeCricket(players, [turn("a", T(14), S(1))]);
    expect(r.stats.a.points).toBe(0);
    expect(Object.values(r.stats.a.marks).every((m) => m === 0)).toBe(true);
  });

  it("scores extra marks while an opponent is open", () => {
    const r = computeCricket(players, [turn("a", T(20), T(20), D(20))]);
    expect(r.stats.a.points).toBe(100);
  });

  it("closing hit with extra marks scores the overflow", () => {
    const r = computeCricket(players, [turn("a", D(20), T(20))]);
    expect(r.stats.a.marks[20]).toBe(3);
    expect(r.stats.a.points).toBe(40);
  });

  it("no points once everyone closed", () => {
    const r = computeCricket(players, [
      turn("a", T(20)),
      turn("b", T(20)),
      turn("a", T(20)),
    ]);
    expect(r.stats.a.points).toBe(0);
  });

  it("winner needs all closed and at least as many points", () => {
    const closeAll = [T(20), T(19), T(18), T(17), T(16), T(15), D(25), S(25)];
    // b scores 60 on 20 first, then a closes everything with 0 points
    const turns: Turn[] = [
      turn("a", MISS),
      turn("b", T(20), T(20)),
      turn("a", ...closeAll.slice(0, 3)),
      turn("b", MISS),
      turn("a", ...closeAll.slice(3, 6)),
      turn("b", MISS),
      turn("a", ...closeAll.slice(6)),
    ];
    const r = computeCricket(players, turns);
    expect(closedCountOf(r.stats.a)).toBe(7);
    expect(r.winnerId).toBeUndefined();

    const more = [...turns, turn("b", MISS), turn("a", T(19), T(19), T(19))];
    // b has 20 closed, but 19 still open → a scores 3×57 = 171 ≥ 60
    expect(computeCricket(players, more).winnerId).toBe("a");
  });
});

function closedCountOf(st: { marks: Record<number, number> }) {
  return Object.values(st.marks).filter((m) => m >= 3).length;
}

describe("game level", () => {
  it("turnIsOver on bust, checkout and third dart", () => {
    const st = stateOf({ start: 301 }, []);
    expect(turnIsOver(st, players, turn("a", T(20)))).toBe(false);
    expect(turnIsOver(st, players, turn("a", MISS, MISS, MISS))).toBe(true);
    const low = stateOf({ start: 301 }, [
      turn("a", T(20), T(20), T(20)),
      turn("b", MISS),
      turn("a", T(20), T(20), T(20)),
      turn("b", MISS),
    ]);
    expect(evaluate(low, players).x01!.stats.a.remaining).toBe(121);
    expect(turnIsOver(low, players, turn("a", T(20), T(20)))).toBe(true);
    expect(turnIsOver(low, players, turn("a", T(20), S(1)))).toBe(false);
    expect(turnIsOver(low, players, turn("a", T(20), T(7), D(20)))).toBe(true);
  });

  it("winnerIds: lowest remaining leads, ties return all, empty before play", () => {
    expect(winnerIds(stateOf({}, []), players)).toEqual([]);
    expect(
      winnerIds(stateOf({}, [turn("a", S(20)), turn("b", S(20))]), players),
    ).toEqual(["a", "b"]);
    expect(
      winnerIds(stateOf({}, [turn("a", S(20)), turn("b", S(19))]), players),
    ).toEqual(["a"]);
  });

  it("winnerIds: cricket leader by points then closed", () => {
    const st = stateOf({ mode: "cricket" }, [turn("a", T(20)), turn("b", T(19), S(19))]);
    expect(winnerIds(st, players)).toEqual(["b"]);
  });

  it("ignores turns of removed players", () => {
    const st = stateOf({}, [turn("x", T(20)), turn("a", S(1))]);
    expect(evaluate(st, players).turns).toHaveLength(1);
  });
});
