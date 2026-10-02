import { describe, expect, it } from "vitest";

import { applyOp, applyOps, compareTimestamps, setIn } from "./optimistic";
import type { GameRow } from "./types";

const row = (state: GameRow["state"]): GameRow => ({
  id: "g",
  code: "ABCDE",
  game_type: "punkte",
  title: null,
  status: "playing",
  players: [
    { id: "a", name: "Anna", color: "#000" },
    { id: "b", name: "Ben", color: "#111" },
  ],
  state,
  group_id: null,
  created_at: "2026-01-01T00:00:00+00:00",
  updated_at: "2026-01-01T00:00:00+00:00",
});

describe("setIn", () => {
  it("sets and deletes the last key", () => {
    expect(setIn({ a: { b: 1 } }, ["a", "c"], 2)).toEqual({ a: { b: 1, c: 2 } });
    expect(setIn({ a: { b: 1 } }, ["a", "b"], undefined)).toEqual({ a: {} });
  });

  it("leaves the target unchanged when a parent is missing (like jsonb_set)", () => {
    const root = { a: 1 };
    expect(setIn(root, ["x", "y"], 2)).toBe(root);
  });

  it("does not mutate the input", () => {
    const root = { a: { b: 1 } };
    setIn(root, ["a", "b"], 5);
    expect(root).toEqual({ a: { b: 1 } });
  });

  it("handles array indexes", () => {
    expect(setIn({ l: [1, 2, 3] }, ["l", "1"], 9)).toEqual({ l: [1, 9, 3] });
    expect(setIn({ l: [1, 2, 3] }, ["l", "0"], undefined)).toEqual({ l: [2, 3] });
  });
});

describe("applyOp", () => {
  it("merges into an existing or missing leaf", () => {
    const base = row({ rounds: { "0": { a: 3 } } });
    const merged = applyOp(base, { kind: "merge", path: ["rounds", "0"], value: { b: 4 } });
    expect(merged.state).toEqual({ rounds: { "0": { a: 3, b: 4 } } });
    const created = applyOp(base, { kind: "merge", path: ["rounds", "1"], value: { a: 1 } });
    expect(created.state).toEqual({ rounds: { "0": { a: 3 }, "1": { a: 1 } } });
  });

  it("clears a path with null", () => {
    const next = applyOp(row({ s: { a: 1, b: 2 } }), { kind: "set", path: ["s", "a"], value: null });
    expect(next.state).toEqual({ s: { b: 2 } });
  });

  it("patches one player", () => {
    const next = applyOp(row({}), { kind: "player", playerId: "b", patch: { name: "Bea" } });
    expect(next.players.map((p) => p.name)).toEqual(["Anna", "Bea"]);
  });

  it("applies ops in order", () => {
    const next = applyOps(row({ n: 1 }), [
      { kind: "set", path: ["n"], value: 2 },
      { kind: "update", patch: { status: "finished" } },
      { kind: "set", path: ["n"], value: 3 },
    ]);
    expect(next.state).toEqual({ n: 3 });
    expect(next.status).toBe("finished");
  });
});

describe("compareTimestamps", () => {
  it("orders across formats and sub-millisecond digits", () => {
    expect(compareTimestamps("2026-01-01T10:00:00.123456+00:00", "2026-01-01 10:00:00.123455+00")).toBeGreaterThan(0);
    expect(compareTimestamps("2026-01-01T10:00:00.1+00:00", "2026-01-01T10:00:00.100000Z")).toBe(0);
    expect(compareTimestamps("2026-01-01T11:00:00+01:00", "2026-01-01T10:00:00.000001+00:00")).toBeLessThan(0);
  });
});
