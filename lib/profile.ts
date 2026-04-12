/**
 * Pure business logic for user profiles.
 * No React, no Supabase — fully unit-testable.
 */

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'help',
  'info',
  'contact',
  'api',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'bourbon',
  'bourbonvault',
  'null',
  'undefined',
  'anonymous',
]);

/**
 * Validate a proposed username.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateUsername(value: string): string | null {
  if (!value || value.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (value.length > MAX_USERNAME_LENGTH) {
    return `Username must be ${MAX_USERNAME_LENGTH} characters or fewer`;
  }
  if (!USERNAME_PATTERN.test(value)) {
    return 'Username may only contain lowercase letters, numbers, and underscores';
  }
  if (RESERVED_USERNAMES.has(value.toLowerCase())) {
    return 'That username is reserved';
  }
  return null;
}

/**
 * Generate the Supabase Storage path for a user's avatar.
 * Produces a path of the form `{userId}/avatar.{ext}`.
 */
export function generateAvatarPath(userId: string, fileExtension: string): string {
  const ext = fileExtension.replace(/^\./, ''); // strip leading dot if present
  return `${userId}/avatar.${ext}`;
}
