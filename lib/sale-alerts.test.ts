import { buildSaleAlertPayload, isSaleAlertExpired, buildRemovalPayload } from './sale-alerts';

// ---------------------------------------------------------------------------
// buildSaleAlertPayload — Slice 1: core wiring (correct IDs in payload)
// ---------------------------------------------------------------------------

describe('buildSaleAlertPayload', () => {
  const groupId = 'group-aaa';
  const bourbonId = 'bourbon-bbb';
  const userId = 'user-ccc';
  const price = '$28';
  const placeId = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
  const placeName = 'Total Wine & More';
  const placeAddress = '123 Main St, Louisville, KY 40202';

  it('returns group_id, bourbon_id, and posted_by', () => {
    const payload = buildSaleAlertPayload(groupId, bourbonId, userId, price, placeId, placeName, placeAddress);
    expect(payload.group_id).toBe(groupId);
    expect(payload.bourbon_id).toBe(bourbonId);
    expect(payload.posted_by).toBe(userId);
  });

  // Slice 2: content details
  it('includes price, place_id, place_name, place_address', () => {
    const payload = buildSaleAlertPayload(groupId, bourbonId, userId, price, placeId, placeName, placeAddress);
    expect(payload.price).toBe(price);
    expect(payload.place_id).toBe(placeId);
    expect(payload.place_name).toBe(placeName);
    expect(payload.place_address).toBe(placeAddress);
  });

  // Slice 3: note handling
  it('includes the note when provided', () => {
    const payload = buildSaleAlertPayload(groupId, bourbonId, userId, price, placeId, placeName, placeAddress, 'Only 3 left!');
    expect(payload.note).toBe('Only 3 left!');
  });

  it('sets note to null when omitted', () => {
    const payload = buildSaleAlertPayload(groupId, bourbonId, userId, price, placeId, placeName, placeAddress);
    expect(payload.note).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isSaleAlertExpired — Slice 4: expiry logic
// ---------------------------------------------------------------------------

describe('isSaleAlertExpired', () => {
  it('returns false for an alert created today', () => {
    const now = new Date().toISOString();
    expect(isSaleAlertExpired(now)).toBe(false);
  });

  it('returns false for an alert created 29 days ago', () => {
    const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSaleAlertExpired(twentyNineDaysAgo)).toBe(false);
  });

  it('returns true for an alert created exactly 30 days ago', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSaleAlertExpired(thirtyDaysAgo)).toBe(true);
  });

  it('returns true for an alert created 60 days ago', () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSaleAlertExpired(sixtyDaysAgo)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildRemovalPayload — Slice 5: removal payload
// ---------------------------------------------------------------------------

describe('buildRemovalPayload', () => {
  it('returns removed_by matching the userId', () => {
    const userId = 'user-xyz';
    const payload = buildRemovalPayload(userId);
    expect(payload.removed_by).toBe(userId);
  });

  it('returns removed_at as a valid ISO timestamp', () => {
    const payload = buildRemovalPayload('user-xyz');
    expect(typeof payload.removed_at).toBe('string');
    expect(new Date(payload.removed_at).getTime()).toBeGreaterThan(0);
  });
});
