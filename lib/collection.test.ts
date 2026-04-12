import { buildAddToCollectionPayload, isAlreadyInCollection } from './collection';
import { userCollectionFactory } from './test-utils/factories';

// ---------------------------------------------------------------------------
// buildAddToCollectionPayload — slice 1: core wiring
// ---------------------------------------------------------------------------

describe('buildAddToCollectionPayload', () => {
  const userId = 'user-abc';
  const bourbonId = 'bourbon-xyz';

  it('returns an object with user_id and bourbon_id', () => {
    const payload = buildAddToCollectionPayload(userId, bourbonId);
    expect(payload.user_id).toBe(userId);
    expect(payload.bourbon_id).toBe(bourbonId);
  });

  // slice 2: default field values
  it('defaults all optional fields to null when no options provided', () => {
    const payload = buildAddToCollectionPayload(userId, bourbonId);
    expect(payload.purchase_price).toBeNull();
    expect(payload.purchase_date).toBeNull();
    expect(payload.purchase_location).toBeNull();
    expect(payload.notes).toBeNull();
  });

  it('uses provided optional fields', () => {
    const payload = buildAddToCollectionPayload(userId, bourbonId, {
      purchase_price: 49.99,
      purchase_date: '2024-01-15',
      purchase_location: 'Total Wine',
      notes: 'Birthday gift',
    });
    expect(payload.purchase_price).toBe(49.99);
    expect(payload.purchase_date).toBe('2024-01-15');
    expect(payload.purchase_location).toBe('Total Wine');
    expect(payload.notes).toBe('Birthday gift');
  });
});

// ---------------------------------------------------------------------------
// isAlreadyInCollection — slice 1: basic match
// ---------------------------------------------------------------------------

describe('isAlreadyInCollection', () => {
  it('returns true when the bourbon is in the collection', () => {
    const item = userCollectionFactory({ bourbon_id: 'bourbon-A' });
    expect(isAlreadyInCollection([item], 'bourbon-A')).toBe(true);
  });

  it('returns false when the bourbon is not in the collection', () => {
    const item = userCollectionFactory({ bourbon_id: 'bourbon-A' });
    expect(isAlreadyInCollection([item], 'bourbon-B')).toBe(false);
  });

  it('returns false for an empty collection', () => {
    expect(isAlreadyInCollection([], 'bourbon-A')).toBe(false);
  });

  it('returns true when one of several items matches', () => {
    const items = [
      userCollectionFactory({ bourbon_id: 'bourbon-A' }),
      userCollectionFactory({ bourbon_id: 'bourbon-B' }),
    ];
    expect(isAlreadyInCollection(items, 'bourbon-B')).toBe(true);
  });
});
