/**
 * Blank-field rules for the Community Bourbon Editing two-tier write model.
 *
 * BLANK_FIELD_RULES declares which fields treat 0 as blank (i.e. a zero value
 * is considered un-filled and a community user may write over it directly via
 * Tier 1). All other fields only treat null / empty-string as blank.
 *
 * This is the single source of truth consumed by:
 *  - Client-side Tier 1 / Tier 2 routing logic in the edit form
 *  - The bourbon_user_update_allowed RLS function (via matching migration)
 */

/** Fields where a value of 0 is treated the same as null (un-filled). */
export const ZERO_IS_BLANK_FIELDS: ReadonlySet<string> = new Set([
  'proof',
  'age_statement',
  'msrp',
]);

/**
 * Returns true when a field value is considered blank (un-filled) — i.e. a
 * community user is allowed to write to it directly without admin review.
 *
 * Rules:
 *  - null → always blank
 *  - empty string → always blank
 *  - 0 → blank only for fields in ZERO_IS_BLANK_FIELDS
 *  - any other value → not blank
 */
export function isFieldBlank(fieldName: string, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (value === 0 && ZERO_IS_BLANK_FIELDS.has(fieldName)) return true;
  return false;
}
