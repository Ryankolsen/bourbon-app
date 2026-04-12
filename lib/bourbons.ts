/**
 * Pure business logic for bourbon search/filtering.
 * No React, no Supabase — fully unit-testable.
 */

/**
 * Build the ilike filter string for a bourbon name search.
 * Returns null when the search term is empty or whitespace-only,
 * indicating no filter should be applied.
 */
export function buildBourbonSearchFilter(search: string | undefined): string | null {
  if (!search || search.trim().length === 0) return null;
  return `%${search.trim()}%`;
}
