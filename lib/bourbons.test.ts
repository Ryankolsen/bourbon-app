import { buildBourbonSearchFilter } from './bourbons';

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
