import { computeRatingStats } from './ratings';

// ---------------------------------------------------------------------------
// computeRatingStats
// ---------------------------------------------------------------------------

describe('computeRatingStats', () => {
  // slice 1: core wiring
  it('returns rating_count and avg_rating for a non-empty list', () => {
    const result = computeRatingStats([{ rating: 8 }, { rating: 6 }]);
    expect(result.rating_count).toBe(2);
    expect(result.avg_rating).toBe(7);
  });

  // slice 2: empty array
  it('returns avg_rating null and rating_count 0 for an empty array', () => {
    const result = computeRatingStats([]);
    expect(result.avg_rating).toBeNull();
    expect(result.rating_count).toBe(0);
  });

  // slice 3: single item
  it('returns the rating itself for a single-item list', () => {
    const result = computeRatingStats([{ rating: 9 }]);
    expect(result.avg_rating).toBe(9);
    expect(result.rating_count).toBe(1);
  });

  // slice 4: null ratings are excluded
  it('excludes null-rating rows from average and count', () => {
    const result = computeRatingStats([
      { rating: 8 },
      { rating: null },
      { rating: 6 },
    ]);
    expect(result.rating_count).toBe(2);
    expect(result.avg_rating).toBe(7);
  });

  it('returns avg_rating null when all ratings are null', () => {
    const result = computeRatingStats([{ rating: null }, { rating: null }]);
    expect(result.avg_rating).toBeNull();
    expect(result.rating_count).toBe(0);
  });

  // slice 5: rounding behaviour (one decimal place)
  it('rounds avg_rating to one decimal place', () => {
    // 7 + 8 + 9 = 24 / 3 = 8.0 — clean
    expect(computeRatingStats([{ rating: 7 }, { rating: 8 }, { rating: 9 }]).avg_rating).toBe(8);

    // 7 + 8 = 15 / 2 = 7.5 — exact half
    expect(computeRatingStats([{ rating: 7 }, { rating: 8 }]).avg_rating).toBe(7.5);

    // 7 + 7 + 8 = 22 / 3 = 7.333… → rounds to 7.3
    expect(computeRatingStats([{ rating: 7 }, { rating: 7 }, { rating: 8 }]).avg_rating).toBe(7.3);
  });
});
