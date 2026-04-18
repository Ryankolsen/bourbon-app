/**
 * Pure business logic for trending bourbon computations.
 * No React, no Supabase — fully unit-testable.
 */

export interface TrendingTastingInput {
  bourbon_id: string;
  tasted_at: string; // ISO date string
  rating: number | null;
}

/**
 * Return bourbon IDs sorted by tasting frequency among the given tastings,
 * filtered to those tasted on or after cutoffDate and with at least 2 tastings.
 *
 * @param tastings  Array of tasting rows (or row fragments)
 * @param cutoffDate  ISO date string — tastings before this date are excluded
 * @returns  Ordered bourbon IDs (most tasted first)
 */
export function computeTrendingByTasteCount(
  tastings: TrendingTastingInput[],
  cutoffDate: string,
): string[] {
  const counts = new Map<string, number>();

  for (const t of tastings) {
    if (t.tasted_at < cutoffDate) continue;
    counts.set(t.bourbon_id, (counts.get(t.bourbon_id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * Return bourbon IDs sorted by average rating (descending) among the given
 * tastings, filtered to those tasted on or after cutoffDate, at least 2
 * tastings total per bourbon, and only rated tastings counted in the average.
 *
 * @param tastings  Array of tasting rows (or row fragments)
 * @param cutoffDate  ISO date string — tastings before this date are excluded
 * @returns  Ordered bourbon IDs (highest avg rating first)
 */
export function computeTrendingByRating(
  tastings: TrendingTastingInput[],
  cutoffDate: string,
): string[] {
  const countMap = new Map<string, number>();
  const ratingSum = new Map<string, number>();
  const ratingCount = new Map<string, number>();

  for (const t of tastings) {
    if (t.tasted_at < cutoffDate) continue;
    countMap.set(t.bourbon_id, (countMap.get(t.bourbon_id) ?? 0) + 1);
    if (t.rating !== null) {
      ratingSum.set(t.bourbon_id, (ratingSum.get(t.bourbon_id) ?? 0) + t.rating);
      ratingCount.set(t.bourbon_id, (ratingCount.get(t.bourbon_id) ?? 0) + 1);
    }
  }

  return [...countMap.entries()]
    .filter(([, count]) => count >= 2)
    .map(([id, count]): [string, number] => {
      const rc = ratingCount.get(id) ?? 0;
      const avg = rc > 0 ? (ratingSum.get(id) ?? 0) / rc : 0;
      return [id, avg];
    })
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
