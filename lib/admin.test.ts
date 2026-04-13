import { isAdmin } from './admin';

const ENV_KEY = 'EXPO_PUBLIC_ADMIN_EMAILS';

afterEach(() => {
  delete process.env[ENV_KEY];
});

describe('isAdmin', () => {
  // 1. Core wiring — exact match against single value
  it('returns true when email exactly matches the single value in EXPO_PUBLIC_ADMIN_EMAILS', () => {
    process.env[ENV_KEY] = 'admin@example.com';
    expect(isAdmin('admin@example.com')).toBe(true);
  });

  // 2. Non-match
  it('returns false when email does not match any value in EXPO_PUBLIC_ADMIN_EMAILS', () => {
    process.env[ENV_KEY] = 'admin@example.com';
    expect(isAdmin('other@example.com')).toBe(false);
  });

  // 3. Multiple values
  it('returns true when email matches one of multiple comma-separated values', () => {
    process.env[ENV_KEY] = 'admin@example.com,super@example.com';
    expect(isAdmin('super@example.com')).toBe(true);
  });

  // 4. Undefined env var
  it('returns false when EXPO_PUBLIC_ADMIN_EMAILS is not set', () => {
    expect(isAdmin('admin@example.com')).toBe(false);
  });

  // 5. Empty string
  it('returns false when EXPO_PUBLIC_ADMIN_EMAILS is an empty string', () => {
    process.env[ENV_KEY] = '';
    expect(isAdmin('admin@example.com')).toBe(false);
  });

  // 6. Case-insensitive
  it('is case-insensitive (uppercase input matches lowercase env var)', () => {
    process.env[ENV_KEY] = 'admin@example.com';
    expect(isAdmin('ADMIN@EXAMPLE.COM')).toBe(true);
  });

  // 7. Whitespace tolerance
  it('handles whitespace around commas in the env var', () => {
    process.env[ENV_KEY] = 'foo@bar.com , baz@bar.com';
    expect(isAdmin('baz@bar.com')).toBe(true);
  });
});
