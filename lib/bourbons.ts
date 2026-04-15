/**
 * Pure business logic for bourbon search/filtering.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type BourbonInsert = Database['public']['Tables']['bourbons']['Insert'];

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

export const BOURBON_TYPES = [
  { label: 'Traditional', value: 'traditional' },
  { label: 'Small Batch', value: 'small_batch' },
  { label: 'Single Barrel', value: 'single_barrel' },
  { label: 'Wheated', value: 'wheated' },
  { label: 'Cask Strength', value: 'cask_strength' },
  { label: 'High Rye', value: 'high_rye' },
  { label: 'Rye', value: 'rye' },
  { label: 'Bottled-in-Bond', value: 'bottled_in_bond' },
  { label: 'Straight', value: 'straight' },
  { label: 'Blended', value: 'blended' },
] as const satisfies readonly { label: string; value: string }[];

export type BourbonTypeValue = (typeof BOURBON_TYPES)[number]['value'];

/** Resolve a snake_case DB value to its human-readable display label. */
export function getBourbonTypeLabel(value: BourbonTypeValue): string {
  return BOURBON_TYPES.find((t) => t.value === value)?.label ?? value;
}

export interface BourbonFilterState {
  /** Selected bourbon types. Empty array = no type filter. */
  types: BourbonTypeValue[];
  /** Minimum proof inclusive. null = no lower bound. */
  proofMin: number | null;
  /** Maximum proof inclusive. null = no upper bound. */
  proofMax: number | null;
  /** Minimum age statement in years. Ignored when nasOnly is true. */
  ageMin: number | null;
  /** Maximum age statement in years. Ignored when nasOnly is true. */
  ageMax: number | null;
  /** When true, only bourbons with no age statement are returned. Overrides ageMin/ageMax. */
  nasOnly: boolean;
  /** ILIKE filter on distillery field. null = no filter. */
  distillery: string | null;
  /** Column to sort by. null = no explicit sort (caller applies its own default). */
  sortField: string | null;
  /** true = ascending, false = descending. Only meaningful when sortField is set. */
  sortAscending: boolean;
}

export const DEFAULT_BOURBON_FILTERS: BourbonFilterState = {
  types: [],
  proofMin: null,
  proofMax: null,
  ageMin: null,
  ageMax: null,
  nasOnly: false,
  distillery: null,
  sortField: null,
  sortAscending: true,
};

/**
 * Minimal chainable query-builder interface used by buildBourbonFilterQuery.
 * Compatible with both the Supabase PostgREST builder and the test mock.
 */
export interface FilterableQuery {
  in(column: string, values: string[]): FilterableQuery;
  gte(column: string, value: number): FilterableQuery;
  lte(column: string, value: number): FilterableQuery;
  is(column: string, value: null): FilterableQuery;
  ilike(column: string, pattern: string): FilterableQuery;
  order(column: string, options?: { ascending?: boolean }): FilterableQuery;
}

/**
 * Apply filter and sort constraints from a BourbonFilterState to a Supabase
 * query builder (or any compatible mock). Returns the mutated query.
 *
 * Pure function — no side effects, same input always produces the same output.
 */
export function buildBourbonFilterQuery(
  query: FilterableQuery,
  filters: BourbonFilterState,
): FilterableQuery {
  if (filters.types.length > 0) {
    query = query.in('type', filters.types);
  }

  if (filters.proofMin !== null) {
    query = query.gte('proof', filters.proofMin);
  }

  if (filters.proofMax !== null) {
    query = query.lte('proof', filters.proofMax);
  }

  if (filters.nasOnly) {
    query = query.is('age_statement', null);
  } else {
    if (filters.ageMin !== null) {
      query = query.gte('age_statement', filters.ageMin);
    }
    if (filters.ageMax !== null) {
      query = query.lte('age_statement', filters.ageMax);
    }
  }

  if (filters.distillery) {
    query = query.ilike('distillery', `%${filters.distillery}%`);
  }

  if (filters.sortField !== null && filters.sortField !== 'social' && filters.sortField !== 'avg_rating') {
    query = query.order(filters.sortField, { ascending: filters.sortAscending });
  }

  return query;
}

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
