import { describe, expect, it } from "vitest";

import { hasFinished, phaseOf, type Phase10Entry } from "./scoring";

const round = (done: boolean, points = 20): Phase10Entry => ({ points, done });

describe("phaseOf", () => {
  it("starts at phase 1", () => {
    expect(phaseOf([])).toBe(1);
  });

  it("advances only on completed phases", () => {
    expect(phaseOf([round(true), round(false), round(true)])).toBe(3);
  });

  it("caps at phase 10", () => {
    expect(phaseOf(Array.from({ length: 12 }, () => round(true)))).toBe(10);
  });
});

describe("hasFinished", () => {
  it("requires ten completed phases", () => {
    expect(hasFinished(Array.from({ length: 9 }, () => round(true)))).toBe(false);
    expect(hasFinished(Array.from({ length: 10 }, () => round(true)))).toBe(true);
  });

  it("ignores rounds without a completed phase", () => {
    const entries = [
      ...Array.from({ length: 10 }, () => round(true)),
      round(false),
    ];
    expect(hasFinished(entries)).toBe(true);
  });
});
