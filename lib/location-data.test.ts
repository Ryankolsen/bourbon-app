import { WHISKEY_COUNTRIES, getProvincesForCountry } from './location-data';

// ---------------------------------------------------------------------------
// WHISKEY_COUNTRIES — slice 1: every entry has non-empty label and value
// ---------------------------------------------------------------------------

describe('WHISKEY_COUNTRIES', () => {
  it('is a non-empty array where every entry has non-empty label and value', () => {
    expect(WHISKEY_COUNTRIES.length).toBeGreaterThan(0);
    for (const country of WHISKEY_COUNTRIES) {
      expect(country.label).toBeTruthy();
      expect(country.value).toBeTruthy();
    }
  });

  // slice 2: contains US
  it("contains an entry with value 'US'", () => {
    expect(WHISKEY_COUNTRIES.some((c) => c.value === 'US')).toBe(true);
  });

  // slice 3: 'Other' exists and is last
  it("contains 'Other' as the last entry", () => {
    const last = WHISKEY_COUNTRIES[WHISKEY_COUNTRIES.length - 1];
    expect(last.value).toBe('Other');
  });
});

// ---------------------------------------------------------------------------
// getProvincesForCountry
// ---------------------------------------------------------------------------

describe('getProvincesForCountry', () => {
  // slice 4: US returns non-empty array with correct shape
  it("returns a non-empty array for 'US' where every entry has non-empty label and value", () => {
    const result = getProvincesForCountry('US');
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
    for (const province of result!) {
      expect(province.label).toBeTruthy();
      expect(province.value).toBeTruthy();
    }
  });

  // slice 5: 'Other' returns null
  it("returns null for 'Other'", () => {
    expect(getProvincesForCountry('Other')).toBeNull();
  });

  // slice 6: unknown country code returns null
  it('returns null for a country code with no known province data', () => {
    expect(getProvincesForCountry('XX')).toBeNull();
  });
});
