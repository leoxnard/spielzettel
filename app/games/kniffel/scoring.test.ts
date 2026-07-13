import { describe, expect, it } from "vitest";

import {
  bonus,
  filledCount,
  grandTotal,
  lowerSubtotal,
  upperComplete,
  upperSubtotal,
} from "./scoring";
import type { KniffelScores } from "./types";

describe("upperSubtotal", () => {
  it("is 0 for an empty sheet", () => {
    expect(upperSubtotal({})).toBe(0);
  });

  it("sums only upper categories", () => {
    const scores: KniffelScores = { ones: 3, sixes: 24, chance: 22 };
    expect(upperSubtotal(scores)).toBe(27);
  });

  it("treats struck (0) as 0 points", () => {
    expect(upperSubtotal({ ones: 0, twos: 6 })).toBe(6);
  });
});

describe("bonus", () => {
  it("gives no bonus at 62", () => {
    expect(bonus({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 })).toBe(0);
  });

  it("gives 35 at exactly 63", () => {
    expect(bonus({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 })).toBe(35);
  });
});

describe("upperComplete", () => {
  it("is false while a category is open", () => {
    expect(upperComplete({ ones: 3 })).toBe(false);
  });

  it("counts struck categories as filled", () => {
    expect(
      upperComplete({ ones: 0, twos: 0, threes: 0, fours: 0, fives: 0, sixes: 0 }),
    ).toBe(true);
  });
});

describe("lowerSubtotal / grandTotal", () => {
  it("sums lower categories including fixed scores", () => {
    const scores: KniffelScores = {
      threeOfAKind: 19,
      fullHouse: 25,
      kniffel: 0, // gestrichen
      chance: 22,
    };
    expect(lowerSubtotal(scores)).toBe(66);
  });

  it("grand total = upper + bonus + lower", () => {
    const scores: KniffelScores = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18, // 63 → +35
      largeStraight: 40,
    };
    expect(grandTotal(scores)).toBe(63 + 35 + 40);
  });
});

describe("filledCount", () => {
  it("counts struck and scored fields, ignores open ones", () => {
    expect(filledCount({})).toBe(0);
    expect(filledCount({ ones: 0, kniffel: 50 })).toBe(2);
  });
});
