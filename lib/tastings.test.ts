import { buildTastingPayload, filterTastingsByBourbon } from './tastings';
import { tastingFactory } from './test-utils/factories';

// ---------------------------------------------------------------------------
// buildTastingPayload — slice 1: core wiring (correct shape returned)
// ---------------------------------------------------------------------------

describe('buildTastingPayload', () => {
  const userId = 'user-abc';
  const bourbonId = 'bourbon-xyz';

  it('returns an object with user_id and bourbon_id', () => {
    const payload = buildTastingPayload(userId, bourbonId, {
      rating: null,
      nose: '',
      palate: '',
      finish: '',
      overallNotes: '',
    });
    expect(payload.user_id).toBe(userId);
    expect(payload.bourbon_id).toBe(bourbonId);
  });

  // slice 2: field values are correct
  it('includes the rating when provided', () => {
    const payload = buildTastingPayload(userId, bourbonId, {
      rating: 4,
      nose: '',
      palate: '',
      finish: '',
      overallNotes: '',
    });
    expect(payload.rating).toBe(4);
  });

  it('trims whitespace from text fields', () => {
    const payload = buildTastingPayload(userId, bourbonId, {
      rating: null,
      nose: '  vanilla  ',
      palate: '  caramel  ',
      finish: '  oak  ',
      overallNotes: '  great  ',
    });
    expect(payload.nose).toBe('vanilla');
    expect(payload.palate).toBe('caramel');
    expect(payload.finish).toBe('oak');
    expect(payload.overall_notes).toBe('great');
  });

  it('converts empty text fields to null', () => {
    const payload = buildTastingPayload(userId, bourbonId, {
      rating: null,
      nose: '',
      palate: '',
      finish: '',
      overallNotes: '',
    });
    expect(payload.nose).toBeNull();
    expect(payload.palate).toBeNull();
    expect(payload.finish).toBeNull();
    expect(payload.overall_notes).toBeNull();
  });

  it('converts whitespace-only text fields to null', () => {
    const payload = buildTastingPayload(userId, bourbonId, {
      rating: null,
      nose: '   ',
      palate: '   ',
      finish: '   ',
      overallNotes: '   ',
    });
    expect(payload.nose).toBeNull();
    expect(payload.palate).toBeNull();
    expect(payload.finish).toBeNull();
    expect(payload.overall_notes).toBeNull();
  });

  it('preserves null rating', () => {
    const payload = buildTastingPayload(userId, bourbonId, {
      rating: null,
      nose: '',
      palate: '',
      finish: '',
      overallNotes: '',
    });
    expect(payload.rating).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// filterTastingsByBourbon
// ---------------------------------------------------------------------------

describe('filterTastingsByBourbon', () => {
  // slice 1: basic wiring
  it('returns only tastings matching the given bourbon ID', () => {
    const target = tastingFactory({ bourbon_id: 'bourbon-A' });
    const other = tastingFactory({ bourbon_id: 'bourbon-B' });
    const result = filterTastingsByBourbon([target, other], 'bourbon-A');
    expect(result).toHaveLength(1);
    expect(result[0].bourbon_id).toBe('bourbon-A');
  });

  // slice 2: edge cases
  it('returns an empty array when none match', () => {
    const t1 = tastingFactory({ bourbon_id: 'bourbon-A' });
    const t2 = tastingFactory({ bourbon_id: 'bourbon-B' });
    const result = filterTastingsByBourbon([t1, t2], 'bourbon-C');
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when given an empty list', () => {
    const result = filterTastingsByBourbon([], 'bourbon-A');
    expect(result).toHaveLength(0);
  });

  it('returns all tastings when all match the bourbon ID', () => {
    const t1 = tastingFactory({ bourbon_id: 'bourbon-A' });
    const t2 = tastingFactory({ bourbon_id: 'bourbon-A' });
    const result = filterTastingsByBourbon([t1, t2], 'bourbon-A');
    expect(result).toHaveLength(2);
  });

  it('does not mutate the original array', () => {
    const tastings = [
      tastingFactory({ bourbon_id: 'bourbon-A' }),
      tastingFactory({ bourbon_id: 'bourbon-B' }),
    ];
    const original = [...tastings];
    filterTastingsByBourbon(tastings, 'bourbon-A');
    expect(tastings).toHaveLength(original.length);
  });
});
