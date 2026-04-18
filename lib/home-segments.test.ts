/**
 * Tests for lib/home-segments.ts
 *
 * Slice 1: segment labels are exactly ['Feed', 'My Collection', 'Wishlist']
 * Slice 2: segment index-to-content mapping (My Collection is index 1, not Wishlist)
 * Slice 3: default selected segment is Feed (index 0)
 */

import { HOME_SEGMENTS, DEFAULT_SEGMENT_INDEX, SEGMENT_CONTENT_KEYS } from './home-segments';

describe('HOME_SEGMENTS', () => {
  it('exports exactly the three segment labels in order', () => {
    expect(HOME_SEGMENTS).toEqual(['Feed', 'My Collection', 'Wishlist']);
  });
});

describe('SEGMENT_CONTENT_KEYS', () => {
  it('maps index 1 to collection content (not wishlist)', () => {
    expect(SEGMENT_CONTENT_KEYS[1]).toBe('collection');
    expect(SEGMENT_CONTENT_KEYS[1]).not.toBe('wishlist');
  });

  it('maps index 2 to wishlist content (not collection)', () => {
    expect(SEGMENT_CONTENT_KEYS[2]).toBe('wishlist');
    expect(SEGMENT_CONTENT_KEYS[2]).not.toBe('collection');
  });
});

describe('DEFAULT_SEGMENT_INDEX', () => {
  it('is 0, meaning the Feed segment is selected by default', () => {
    expect(DEFAULT_SEGMENT_INDEX).toBe(0);
    expect(HOME_SEGMENTS[DEFAULT_SEGMENT_INDEX]).toBe('Feed');
  });
});
