import { describe, expect, it } from "vitest";

import { wizardMaxRounds, wizardRoundScore } from "./scoring";

describe("wizardRoundScore", () => {
  it("rewards exact bids with 20 + 10 per trick", () => {
    expect(wizardRoundScore({ bid: 0, tricks: 0 })).toBe(20);
    expect(wizardRoundScore({ bid: 3, tricks: 3 })).toBe(50);
  });

  it("penalizes 10 per trick of deviation", () => {
    expect(wizardRoundScore({ bid: 2, tricks: 4 })).toBe(-20);
    expect(wizardRoundScore({ bid: 4, tricks: 1 })).toBe(-30);
  });

  it("treats incomplete entries as 0", () => {
    expect(wizardRoundScore({ bid: 2, tricks: null })).toBe(0);
  });
});

describe("wizardMaxRounds", () => {
  it("deals all 60 cards", () => {
    expect(wizardMaxRounds(3)).toBe(20);
    expect(wizardMaxRounds(4)).toBe(15);
    expect(wizardMaxRounds(5)).toBe(12);
    expect(wizardMaxRounds(6)).toBe(10);
  });
});
