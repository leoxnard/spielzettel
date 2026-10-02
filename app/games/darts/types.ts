import type { BaseSettings } from "../types";

export type DartsMode = "x01" | "cricket";
export type X01Start = 301 | 501 | 701;
export type Multiplier = 1 | 2 | 3;

/** One dart: segment 0 = miss, 1–20, 25 = bull (×2 = 50). No triple bull. */
export type Dart = { segment: number; multiplier: Multiplier };

/**
 * One visit at the board. Either single darts (`darts`) or — X01 quick
 * entry — just the 3-dart `total` with `darts` left empty.
 */
export type Turn = { playerId: string; darts: Dart[]; total?: number };

export interface DartsSettings extends BaseSettings {
  mode?: DartsMode;
  start?: X01Start;
  doubleOut?: boolean;
  doubleIn?: boolean;
}

/**
 * Turns live under turns["0"], turns["1"], … and are written one per
 * set_state_at call; everything else (scores, current player, winner) is
 * derived in logic.ts.
 */
export interface DartsState {
  settings: DartsSettings;
  turns?: Record<string, Turn>;
}
