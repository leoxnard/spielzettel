import { describe, expect, it } from "vitest";

import {
  spadesRoundScore,
  spadesTeamBags,
  spadesTeamRoundScore,
  spadesTeams,
  spadesTeamTotal,
  spadesTotal,
} from "./scoring";

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

describe("spadesTeams", () => {
  const players = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}` }));

  it("pairs opposite seats with 4 or 6 players", () => {
    expect(spadesTeams(players(4))).toEqual([["p0", "p2"], ["p1", "p3"]]);
    expect(spadesTeams(players(6))).toEqual([
      ["p0", "p3"],
      ["p1", "p4"],
      ["p2", "p5"],
    ]);
  });

  it("lets everyone play alone otherwise", () => {
    expect(spadesTeams(players(3))).toEqual([["p0"], ["p1"], ["p2"]]);
  });
});

describe("spadesTeamRoundScore", () => {
  it("adds partner bids and tricks into one contract", () => {
    // Bid 3 + 4 = 7, took 2 + 6 = 8 → 70 + 1 bag
    expect(
      spadesTeamRoundScore([
        { bid: 3, tricks: 2 },
        { bid: 4, tricks: 6 },
      ]),
    ).toBe(71);
    expect(
      spadesTeamRoundScore([
        { bid: 3, tricks: 2 },
        { bid: 4, tricks: 4 },
      ]),
    ).toBe(-70);
  });

  it("scores nil separately without helping the partner", () => {
    expect(
      spadesTeamRoundScore([
        { bid: 0, tricks: 0 },
        { bid: 4, tricks: 5 },
      ]),
    ).toBe(100 + 41);
    expect(
      spadesTeamRoundScore([
        { bid: 0, tricks: 2 },
        { bid: 4, tricks: 3 },
      ]),
    ).toBe(-100 - 40);
  });

  it("treats empty tricks as zero, so a nil with no tricks scores 100", () => {
    expect(
      spadesTeamRoundScore([
        { bid: 0, tricks: null },
        { bid: 4, tricks: 4 },
      ]),
    ).toBe(140);
  });

  it("matches individual scoring for a team of one", () => {
    expect(spadesTeamRoundScore([{ bid: 4, tricks: 6 }])).toBe(42);
  });
});

describe("spadesTeamTotal", () => {
  it("applies the bag penalty to the team's combined bags", () => {
    const round = [
      { bid: 2, tricks: 3 },
      { bid: 2, tricks: 3 },
    ];
    // 5 rounds × (40 + 2 bags) = 210, 10 bags → −100
    expect(spadesTeamTotal(Array.from({ length: 5 }, () => round))).toBe(110);
  });
});

describe("spadesTeamBags", () => {
  it("counts bags toward the next penalty", () => {
    const round = [{ bid: 2, tricks: 5 }, { bid: 2, tricks: 3 }];
    // 4 bags per round: 3 rounds = 12 → 2 toward the next penalty
    expect(spadesTeamBags([round, round, round])).toBe(2);
  });
});
