import { buildBourbonSearchFilter, buildBourbonInsertPayload, buildBourbonUpdatePayload, tokenizeName } from './bourbons';

// ---------------------------------------------------------------------------
// buildBourbonUpdatePayload
// ---------------------------------------------------------------------------

describe('buildBourbonUpdatePayload', () => {
  const updatedBy = 'admin-user-id';

  // Slice 1 — core wiring: stamps updated_by and includes provided fields
  it('stamps updated_by with the provided user id', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { name: 'New Name' });
    expect(payload.updated_by).toBe(updatedBy);
  });

  it('includes the provided field in the payload', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { name: 'New Name' });
    expect(payload.name).toBe('New Name');
  });

  // Slice 2 — numeric conversion: proof, age_statement, msrp as strings → numbers
  it('converts proof string to number', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { proof: '107' });
    expect(payload.proof).toBe(107);
  });

  it('converts age_statement string to number', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { age_statement: '12' });
    expect(payload.age_statement).toBe(12);
  });

  it('converts msrp string to number', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { msrp: '49.99' });
    expect(payload.msrp).toBeCloseTo(49.99);
  });

  // Slice 3 — empty string → null for optional string fields
  it('converts empty string distillery to null', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { distillery: '' });
    expect(payload.distillery).toBeNull();
  });

  // Slice 4 — does not include fields that were not provided
  it('does not include fields absent from the input', () => {
    const payload = buildBourbonUpdatePayload(updatedBy, { name: 'Test' });
    expect(Object.keys(payload)).not.toContain('description');
    expect(Object.keys(payload)).not.toContain('city');
  });
});

// ---------------------------------------------------------------------------
// tokenizeName
// ---------------------------------------------------------------------------

describe('tokenizeName', () => {
  it('splits a name into lowercase tokens', () => {
    expect(tokenizeName('Pappy Van Winkle')).toEqual(['pappy', 'van', 'winkle']);
  });

  it('returns a single token for a single word', () => {
    expect(tokenizeName('Buffalo')).toEqual(['buffalo']);
  });

  it('trims leading and trailing whitespace before splitting', () => {
    expect(tokenizeName('  Blanton\'s Original  ')).toEqual(['blanton\'s', 'original']);
  });

  it('collapses multiple spaces between words', () => {
    expect(tokenizeName('Maker\'s  Mark')).toEqual(['maker\'s', 'mark']);
  });

  it('returns an empty array for a whitespace-only string', () => {
    expect(tokenizeName('   ')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(tokenizeName('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildBourbonSearchFilter
// ---------------------------------------------------------------------------

describe('buildBourbonSearchFilter', () => {
  it('wraps a search term in % wildcards', () => {
    expect(buildBourbonSearchFilter('pappy')).toBe('%pappy%');
  });

  it('trims surrounding whitespace before wrapping', () => {
    expect(buildBourbonSearchFilter('  angel  ')).toBe('%angel%');
  });

  it('returns null for an empty string', () => {
    expect(buildBourbonSearchFilter('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(buildBourbonSearchFilter('   ')).toBeNull();
  });

  it('returns null when undefined is passed', () => {
    expect(buildBourbonSearchFilter(undefined)).toBeNull();
  });

  it('preserves internal spaces in multi-word search terms', () => {
    expect(buildBourbonSearchFilter('pappy van winkle')).toBe('%pappy van winkle%');
  });
});

// ---------------------------------------------------------------------------
// buildBourbonInsertPayload
// ---------------------------------------------------------------------------

describe('buildBourbonInsertPayload', () => {
  const userId = 'user-abc-123';

  const minimalFields = {
    name: 'Blanton\'s Original',
    distillery: 'Buffalo Trace',
    proof: '93',
  };

  it('stamps submitted_by with the userId argument', () => {
    const payload = buildBourbonInsertPayload(userId, minimalFields);
    expect(payload.submitted_by).toBe(userId);
  });

  it('maps name, distillery, and proof correctly', () => {
    const payload = buildBourbonInsertPayload(userId, minimalFields);
    expect(payload.name).toBe('Blanton\'s Original');
    expect(payload.distillery).toBe('Buffalo Trace');
    expect(payload.proof).toBe(93);
  });

  it('trims whitespace from name and distillery', () => {
    const payload = buildBourbonInsertPayload(userId, {
      ...minimalFields,
      name: '  Pappy Van Winkle  ',
      distillery: '  Old Rip Van Winkle  ',
    });
    expect(payload.name).toBe('Pappy Van Winkle');
    expect(payload.distillery).toBe('Old Rip Van Winkle');
  });

  it('sets omitted optional fields to null', () => {
    const payload = buildBourbonInsertPayload(userId, minimalFields);
    expect(payload.type).toBeNull();
    expect(payload.age_statement).toBeNull();
    expect(payload.mashbill).toBeNull();
    expect(payload.msrp).toBeNull();
    expect(payload.description).toBeNull();
    expect(payload.city).toBeNull();
    expect(payload.state).toBeNull();
    expect(payload.country).toBeNull();
  });

  it('passes through non-empty optional fields', () => {
    const payload = buildBourbonInsertPayload(userId, {
      ...minimalFields,
      type: 'single_barrel',
      age_statement: '12',
      mashbill: '75% corn',
      msrp: '49.99',
      city: 'Frankfort',
      state: 'Kentucky',
      country: 'USA',
    });
    expect(payload.type).toBe('single_barrel');
    expect(payload.age_statement).toBe(12);
    expect(payload.mashbill).toBe('75% corn');
    expect(payload.msrp).toBeCloseTo(49.99);
    expect(payload.city).toBe('Frankfort');
    expect(payload.state).toBe('Kentucky');
    expect(payload.country).toBe('USA');
  });

  it('converts empty-string optional fields to null', () => {
    const payload = buildBourbonInsertPayload(userId, {
      ...minimalFields,
      type: '',
      description: '',
      city: '',
    });
    expect(payload.type).toBeNull();
    expect(payload.description).toBeNull();
    expect(payload.city).toBeNull();
  });
});
