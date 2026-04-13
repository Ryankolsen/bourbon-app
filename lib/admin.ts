/**
 * Pure business logic for admin identification.
 * No React, no Supabase — fully unit-testable.
 */

/**
 * Returns true if the given email is in the EXPO_PUBLIC_ADMIN_EMAILS
 * environment variable (comma-separated, case-insensitive, whitespace-tolerant).
 */
export function isAdmin(email: string): boolean {
  const raw = process.env.EXPO_PUBLIC_ADMIN_EMAILS;
  if (!raw) return false;

  const adminEmails = raw
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.toLowerCase());
}
