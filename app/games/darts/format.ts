import { t } from "~/i18n/de";
import { BULL } from "./logic";
import type { Dart } from "./types";

/** Short label for one dart: "T20", "D16", "7", "Bull", "25", "0". */
export function dartLabel(d: Dart): string {
  if (d.segment === 0) return t.darts.missShort;
  if (d.segment === BULL) return d.multiplier === 2 ? t.darts.bull : t.darts.outerBull;
  if (d.multiplier === 3) return t.darts.dartTriple(d.segment);
  if (d.multiplier === 2) return t.darts.dartDouble(d.segment);
  return String(d.segment);
}

export function formatAverage(avg: number | null): string {
  return avg === null ? t.darts.emptySlot : avg.toFixed(1).replace(".", ",");
}
