import { supabase } from "~/lib/supabase";

export interface RatingStats {
  avg: number;
  count: number;
}

export type RatingMap = Record<string, RatingStats>;

interface Row {
  slug: string;
  avg: number | string;
  count: number;
}

const toStats = (row: Row): RatingStats => ({
  avg: Number(row.avg),
  count: row.count,
});

/**
 * Community ratings (migration 0014). Resolves to null when the backend
 * doesn't have them yet, so the UI can hide ratings instead of failing.
 */
export async function fetchRatings(): Promise<RatingMap | null> {
  const { data, error } = await supabase.rpc("catalog_rating_stats");
  if (error) return null;
  return Object.fromEntries((data as Row[]).map((r) => [r.slug, toStats(r)]));
}

/** `stars: null` withdraws this device's rating. */
export async function rateGame(
  slug: string,
  device: string,
  stars: number | null,
): Promise<RatingStats> {
  const { data, error } = await supabase.rpc("rate_catalog_game", {
    p_slug: slug,
    p_device: device,
    p_stars: stars,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  return row ? toStats(row) : { avg: 0, count: 0 };
}
