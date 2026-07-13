export type KniffelCategory =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "threeOfAKind"
  | "fourOfAKind"
  | "fullHouse"
  | "smallStraight"
  | "largeStraight"
  | "kniffel"
  | "chance";

/**
 * upper — count how many dice show the category's face (0–5)
 * sum   — enter the sum of all five dice (direct or dice calculator)
 * fixed — either achieved (fixed points) or struck
 */
export type CategoryKind = "upper" | "sum" | "fixed";

export interface CategoryDef {
  id: KniffelCategory;
  kind: CategoryKind;
  /** upper only: the die face this category counts */
  face?: 1 | 2 | 3 | 4 | 5 | 6;
  /** fixed only */
  fixedScore?: number;
  /** sum only: maximum enterable value */
  max?: number;
}

export const UPPER_CATEGORIES: readonly CategoryDef[] = [
  { id: "ones", kind: "upper", face: 1 },
  { id: "twos", kind: "upper", face: 2 },
  { id: "threes", kind: "upper", face: 3 },
  { id: "fours", kind: "upper", face: 4 },
  { id: "fives", kind: "upper", face: 5 },
  { id: "sixes", kind: "upper", face: 6 },
];

export const LOWER_CATEGORIES: readonly CategoryDef[] = [
  { id: "threeOfAKind", kind: "sum", max: 30 },
  { id: "fourOfAKind", kind: "sum", max: 30 },
  { id: "fullHouse", kind: "fixed", fixedScore: 25 },
  { id: "smallStraight", kind: "fixed", fixedScore: 30 },
  { id: "largeStraight", kind: "fixed", fixedScore: 40 },
  { id: "kniffel", kind: "fixed", fixedScore: 50 },
  { id: "chance", kind: "sum", max: 30 },
];

export const ALL_CATEGORIES: readonly CategoryDef[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
];

export const BONUS_THRESHOLD = 63;
export const BONUS_POINTS = 35;

/**
 * Score per category: a number of points; 0 means struck (or a zero roll —
 * identical for scoring). Missing key = still open.
 */
export type KniffelScores = Partial<Record<KniffelCategory, number>>;

export interface KniffelState {
  settings?: unknown;
  scores: Record<string, KniffelScores>;
}
