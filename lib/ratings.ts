/**
 * Pure business logic for ratings.
 * No React, no Supabase — fully unit-testable.
 */

export interface RatingStats {
  avg_rating: number | null;
  rating_count: number;
}

/**
 * Compute average rating and count from an array of raw rating rows.
 * Rows with null ratings are excluded from the average but not counted.
 *
 * @param ratings - Array of objects with an optional `rating` field.
 * @returns avg_rating rounded to one decimal place, or null if no rated rows.
 */
export function computeRatingStats(
  ratings: Array<{ rating: number | null }>,
): RatingStats {
  const rated = ratings.filter(
    (r): r is { rating: number } => r.rating !== null,
  );
  if (rated.length === 0) {
    return { avg_rating: null, rating_count: 0 };
  }
  const sum = rated.reduce((acc, r) => acc + r.rating, 0);
  const avg = sum / rated.length;
  return {
    avg_rating: Math.round(avg * 10) / 10,
    rating_count: rated.length,
  };
}

/**
 * Normalize the response from the get_group_avg_rating RPC into a RatingStats
 * object. Returns zero-stats when the RPC result is empty or null.
 */
export function normalizeGroupRatingResponse(
  data: Array<{ avg_rating: number | null; rating_count: number }> | null,
): RatingStats {
  if (!data || data.length === 0) {
    return { avg_rating: null, rating_count: 0 };
  }
  const row = data[0];
  return {
    avg_rating: row.avg_rating ?? null,
    rating_count: Number(row.rating_count),
  };
}
