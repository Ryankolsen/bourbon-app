/**
 * Tests for lib/trending.ts pure functions.
 * Red/green/refactor — one slice at a time.
 */

import { computeTrendingByTasteCount, computeTrendingByRating } from './trending';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Slice 1: computeTrendingByTasteCount — core wiring
// ---------------------------------------------------------------------------

describe('computeTrendingByTasteCount', () => {
  it('returns only bourbons with >= 2 tastings in the window', () => {
    const cutoff = daysAgo(30);
    const tastings = [
      { bourbon_id: 'a', tasted_at: daysAgo(1), rating: 8 },
      { bourbon_id: 'a', tasted_at: daysAgo(2), rating: 7 },
      { bourbon_id: 'a', tasted_at: daysAgo(3), rating: 9 },
      { bourbon_id: 'b', tasted_at: daysAgo(5), rating: 8 },
    ];
    const result = computeTrendingByTasteCount(tastings, cutoff);
    expect(result).toEqual(['a']);
  });

  // Slice 2: ordering
  it('sorts by tasting count descending', () => {
    const cutoff = daysAgo(30);
    const tastings = [
      { bourbon_id: 'b', tasted_at: daysAgo(1), rating: 8 },
      { bourbon_id: 'b', tasted_at: daysAgo(2), rating: 8 },
      { bourbon_id: 'a', tasted_at: daysAgo(1), rating: 9 },
      { bourbon_id: 'a', tasted_at: daysAgo(3), rating: 7 },
      { bourbon_id: 'a', tasted_at: daysAgo(5), rating: 8 },
    ];
    const result = computeTrendingByTasteCount(tastings, cutoff);
    expect(result).toEqual(['a', 'b']);
  });

  // Slice 3: edge cases
  it('returns [] when all tastings are before the cutoff', () => {
    const cutoff = daysAgo(0); // now — everything is before
    const tastings = [
      { bourbon_id: 'a', tasted_at: daysAgo(5), rating: 8 },
      { bourbon_id: 'a', tasted_at: daysAgo(6), rating: 7 },
    ];
    expect(computeTrendingByTasteCount(tastings, cutoff)).toEqual([]);
  });

  it('returns [] when input is empty', () => {
    expect(computeTrendingByTasteCount([], daysAgo(30))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Slice 1b: computeTrendingByRating — core wiring
// ---------------------------------------------------------------------------

describe('computeTrendingByRating', () => {
  it('returns only bourbons with >= 2 tastings in the window', () => {
    const cutoff = daysAgo(30);
    const tastings = [
      { bourbon_id: 'a', tasted_at: daysAgo(1), rating: 9 },
      { bourbon_id: 'a', tasted_at: daysAgo(2), rating: 8 },
      { bourbon_id: 'b', tasted_at: daysAgo(3), rating: 10 },
    ];
    const result = computeTrendingByRating(tastings, cutoff);
    expect(result).toEqual(['a']);
  });

  // Slice 2b: ordering by avg rating
  it('sorts by average rating descending', () => {
    const cutoff = daysAgo(30);
    const tastings = [
      // bourbon a: avg 8.5
      { bourbon_id: 'a', tasted_at: daysAgo(1), rating: 9 },
      { bourbon_id: 'a', tasted_at: daysAgo(2), rating: 8 },
      // bourbon b: avg 7
      { bourbon_id: 'b', tasted_at: daysAgo(1), rating: 7 },
      { bourbon_id: 'b', tasted_at: daysAgo(3), rating: 7 },
    ];
    const result = computeTrendingByRating(tastings, cutoff);
    expect(result).toEqual(['a', 'b']);
  });

  // Slice 3b: edge cases
  it('returns [] when all tastings are before the cutoff', () => {
    const cutoff = daysAgo(0);
    const tastings = [
      { bourbon_id: 'a', tasted_at: daysAgo(5), rating: 9 },
      { bourbon_id: 'a', tasted_at: daysAgo(6), rating: 8 },
    ];
    expect(computeTrendingByRating(tastings, cutoff)).toEqual([]);
  });

  it('returns [] when input is empty', () => {
    expect(computeTrendingByRating([], daysAgo(30))).toEqual([]);
  });

  it('excludes tastings with null rating from average', () => {
    const cutoff = daysAgo(30);
    const tastings = [
      // bourbon a: 2 rated (avg 8) + 1 null
      { bourbon_id: 'a', tasted_at: daysAgo(1), rating: 8 },
      { bourbon_id: 'a', tasted_at: daysAgo(2), rating: 8 },
      { bourbon_id: 'a', tasted_at: daysAgo(3), rating: null },
    ];
    const result = computeTrendingByRating(tastings, cutoff);
    // Has >= 2 total tastings in window, should appear
    expect(result).toEqual(['a']);
  });
});
