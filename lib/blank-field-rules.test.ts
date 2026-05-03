import { isFieldBlank, ZERO_IS_BLANK_FIELDS } from './blank-field-rules';

describe('ZERO_IS_BLANK_FIELDS', () => {
  it('includes proof, age_statement, and msrp', () => {
    expect(ZERO_IS_BLANK_FIELDS.has('proof')).toBe(true);
    expect(ZERO_IS_BLANK_FIELDS.has('age_statement')).toBe(true);
    expect(ZERO_IS_BLANK_FIELDS.has('msrp')).toBe(true);
  });

  it('does not include string fields', () => {
    expect(ZERO_IS_BLANK_FIELDS.has('distillery')).toBe(false);
    expect(ZERO_IS_BLANK_FIELDS.has('name')).toBe(false);
    expect(ZERO_IS_BLANK_FIELDS.has('mashbill')).toBe(false);
  });
});

describe('isFieldBlank — core wiring', () => {
  it('returns true for null on a numeric field', () => {
    expect(isFieldBlank('proof', null)).toBe(true);
  });

  it('returns true for undefined on a numeric field', () => {
    expect(isFieldBlank('proof', undefined)).toBe(true);
  });
});

describe('isFieldBlank — numeric fields (proof, age_statement, msrp)', () => {
  it('proof: 0 is blank', () => {
    expect(isFieldBlank('proof', 0)).toBe(true);
  });

  it('proof: real value is not blank', () => {
    expect(isFieldBlank('proof', 90)).toBe(false);
  });

  it('age_statement: 0 is blank', () => {
    expect(isFieldBlank('age_statement', 0)).toBe(true);
  });

  it('age_statement: real value is not blank', () => {
    expect(isFieldBlank('age_statement', 10)).toBe(false);
  });

  it('msrp: 0 is blank', () => {
    expect(isFieldBlank('msrp', 0)).toBe(true);
  });

  it('msrp: real value is not blank', () => {
    expect(isFieldBlank('msrp', 49.99)).toBe(false);
  });
});

describe('isFieldBlank — string fields', () => {
  it('distillery: null is blank', () => {
    expect(isFieldBlank('distillery', null)).toBe(true);
  });

  it('distillery: empty string is blank', () => {
    expect(isFieldBlank('distillery', '')).toBe(true);
  });

  it('distillery: real value is not blank', () => {
    expect(isFieldBlank('distillery', 'Buffalo Trace')).toBe(false);
  });

  it('distillery: 0 is NOT blank (0 is not a valid string value)', () => {
    expect(isFieldBlank('distillery', 0)).toBe(false);
  });
});

describe('isFieldBlank — edge cases', () => {
  it('proof: empty string is blank (treated same as null)', () => {
    expect(isFieldBlank('proof', '')).toBe(true);
  });

  it('unknown field: 0 is not blank (defaults to non-zero-blank)', () => {
    expect(isFieldBlank('unknown_field', 0)).toBe(false);
  });

  it('unknown field: null is still blank', () => {
    expect(isFieldBlank('unknown_field', null)).toBe(true);
  });
});
