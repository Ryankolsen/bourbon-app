import { buildAddToWishlistPayload, isAlreadyWishlisted } from './wishlist';
import { userWishlistFactory } from './test-utils/factories';

// ---------------------------------------------------------------------------
// buildAddToWishlistPayload — slice 1: core wiring
// ---------------------------------------------------------------------------

describe('buildAddToWishlistPayload', () => {
  const userId = 'user-abc';
  const bourbonId = 'bourbon-xyz';

  it('returns an object with user_id and bourbon_id', () => {
    const payload = buildAddToWishlistPayload(userId, bourbonId);
    expect(payload.user_id).toBe(userId);
    expect(payload.bourbon_id).toBe(bourbonId);
  });

  // slice 2: default field values
  it('defaults priority to 0 and notes to null when no options provided', () => {
    const payload = buildAddToWishlistPayload(userId, bourbonId);
    expect(payload.priority).toBe(0);
    expect(payload.notes).toBeNull();
  });

  it('uses provided priority and notes', () => {
    const payload = buildAddToWishlistPayload(userId, bourbonId, { priority: 2, notes: 'Must try' });
    expect(payload.priority).toBe(2);
    expect(payload.notes).toBe('Must try');
  });
});

// ---------------------------------------------------------------------------
// isAlreadyWishlisted — slice 1: basic match
// ---------------------------------------------------------------------------

describe('isAlreadyWishlisted', () => {
  it('returns true when the bourbon is on the wishlist', () => {
    const item = userWishlistFactory({ bourbon_id: 'bourbon-A' });
    expect(isAlreadyWishlisted([item], 'bourbon-A')).toBe(true);
  });

  it('returns false when the bourbon is not on the wishlist', () => {
    const item = userWishlistFactory({ bourbon_id: 'bourbon-A' });
    expect(isAlreadyWishlisted([item], 'bourbon-B')).toBe(false);
  });

  it('returns false for an empty wishlist', () => {
    expect(isAlreadyWishlisted([], 'bourbon-A')).toBe(false);
  });

  it('returns true when one of several items matches', () => {
    const items = [
      userWishlistFactory({ bourbon_id: 'bourbon-A' }),
      userWishlistFactory({ bourbon_id: 'bourbon-B' }),
    ];
    expect(isAlreadyWishlisted(items, 'bourbon-B')).toBe(true);
  });
});
