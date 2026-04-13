/**
 * Pure business logic for bourbon search/filtering.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type BourbonInsert = Database['public']['Tables']['bourbons']['Insert'];

/**
 * Split a bourbon name into normalized search tokens.
 * Splits on whitespace, lowercases each token, and filters empty strings.
 * Apostrophes and other punctuation are preserved in the token so callers
 * can decide how to use them (e.g., pass directly to ILIKE patterns).
 */
export function tokenizeName(name: string): string[] {
  return name.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Build the ilike filter string for a bourbon name search.
 * Returns null when the search term is empty or whitespace-only,
 * indicating no filter should be applied.
 */
export function buildBourbonSearchFilter(search: string | undefined): string | null {
  if (!search || search.trim().length === 0) return null;
  return `%${search.trim()}%`;
}

export interface BourbonFormFields {
  name: string;
  distillery: string;
  proof: string;
  type?: string;
  age_statement?: string;
  mashbill?: string;
  msrp?: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Build the Supabase insert payload for a new bourbon from raw form values.
 * Trims string fields, converts empty strings to null, parses numerics,
 * and stamps submitted_by with the authenticated user's ID.
 */
export function buildBourbonInsertPayload(
  userId: string,
  fields: BourbonFormFields,
): BourbonInsert {
  const trimOrNull = (v: string | undefined): string | null =>
    v && v.trim() ? v.trim() : null;

  const parseFloatOrNull = (v: string | undefined): number | null => {
    if (!v || !v.trim()) return null;
    const n = parseFloat(v.trim());
    return isNaN(n) ? null : n;
  };

  return {
    name: fields.name.trim(),
    distillery: trimOrNull(fields.distillery),
    proof: parseFloatOrNull(fields.proof),
    type: trimOrNull(fields.type),
    age_statement: parseFloatOrNull(fields.age_statement),
    mashbill: trimOrNull(fields.mashbill),
    msrp: parseFloatOrNull(fields.msrp),
    description: trimOrNull(fields.description),
    city: trimOrNull(fields.city),
    state: trimOrNull(fields.state),
    country: trimOrNull(fields.country),
    submitted_by: userId,
  };
}
