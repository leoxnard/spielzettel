import { describe, expect, it } from "vitest";

import { spadesRoundScore, spadesTotal } from "./scoring";

describe("spadesRoundScore", () => {
  it("scores made bids with 10 per bid plus 1 per bag", () => {
    expect(spadesRoundScore({ bid: 4, tricks: 4 })).toBe(40);
    expect(spadesRoundScore({ bid: 4, tricks: 6 })).toBe(42);
  });

  it("sets missed bids at -10 per bid", () => {
    expect(spadesRoundScore({ bid: 5, tricks: 3 })).toBe(-50);
  });

  it("scores nil bids ±100", () => {
    expect(spadesRoundScore({ bid: 0, tricks: 0 })).toBe(100);
    expect(spadesRoundScore({ bid: 0, tricks: 2 })).toBe(-100);
  });
});

describe("spadesTotal", () => {
  it("sums round scores", () => {
    expect(
      spadesTotal([
        { bid: 3, tricks: 3 },
        { bid: 2, tricks: 1 },
      ]),
    ).toBe(30 - 20);
  });

  it("subtracts 100 once 10 bags are collected", () => {
    const rounds = Array.from({ length: 5 }, () => ({ bid: 3, tricks: 5 }));
    // 5 × (30 + 2 bags) = 160, 10 bags → −100
    expect(spadesTotal(rounds)).toBe(60);
  });

  it("ignores unplayed rounds", () => {
    expect(spadesTotal([undefined, { bid: 1, tricks: 1 }])).toBe(10);
  });
});
