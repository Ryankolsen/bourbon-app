import { useReducer, useCallback } from 'react';
import {
  BourbonFilterState,
  BourbonTypeValue,
  DEFAULT_BOURBON_FILTERS,
  buildBourbonFilterQuery,
  FilterableQuery,
} from '@/lib/bourbons';

// ---------------------------------------------------------------------------
// Private: client-side filtering for collection items (nested bourbons object)
// ---------------------------------------------------------------------------

type AnyBourbonRow = Record<string, unknown> | null;

function getField(bourbon: AnyBourbonRow, field: string): unknown {
  return bourbon ? bourbon[field] : undefined;
}

function filterCollectionItems<T extends { bourbons: unknown }>(
  items: T[],
  filters: BourbonFilterState,
): T[] {
  const { types, proofMin, proofMax, ageMin, ageMax, nasOnly, distillery, sortField, sortAscending } =
    filters;

  let result = items.filter((item) => {
    const b = item.bourbons as AnyBourbonRow;
    if (!b) return false;

    if (types.length > 0) {
      const itemType = getField(b, 'type') as BourbonTypeValue | null;
      if (!itemType || !types.includes(itemType)) return false;
    }

    const proof = getField(b, 'proof') as number | null;
    if (proofMin !== null && (proof === null || proof < proofMin)) return false;
    if (proofMax !== null && (proof === null || proof > proofMax)) return false;

    const age = getField(b, 'age_statement') as number | null;
    if (nasOnly) {
      if (age !== null) return false;
    } else {
      if (ageMin !== null && (age === null || age < ageMin)) return false;
      if (ageMax !== null && (age === null || age > ageMax)) return false;
    }

    if (distillery) {
      const dist = getField(b, 'distillery') as string | null;
      if (!dist || !dist.toLowerCase().includes(distillery.toLowerCase())) return false;
    }

    return true;
  });

  if (sortField && sortField !== 'social' && sortField !== 'avg_rating') {
    result = [...result].sort((a, b) => {
      const bA = a.bourbons as AnyBourbonRow;
      const bB = b.bourbons as AnyBourbonRow;
      const valA = getField(bA, sortField) as string | number | null;
      const valB = getField(bB, sortField) as string | number | null;

      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortAscending ? cmp : -cmp;
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type FilterAction =
  | { type: 'APPLY'; next: BourbonFilterState }
  | { type: 'PATCH'; patch: Partial<BourbonFilterState> }
  | { type: 'RESET' };

function filterReducer(state: BourbonFilterState, action: FilterAction): BourbonFilterState {
  switch (action.type) {
    case 'APPLY':
      return action.next;
    case 'PATCH':
      return { ...state, ...action.patch };
    case 'RESET':
      return DEFAULT_BOURBON_FILTERS;
  }
}

// ---------------------------------------------------------------------------
// Hook public interface
// ---------------------------------------------------------------------------

export interface UseBourbonFiltersReturn {
  /** Current filter + sort state (read-only). */
  filters: BourbonFilterState;
  /** true when any filter or sort differs from the defaults. */
  hasActiveFilters: boolean;
  /** Atomically replace the entire filter state. */
  applyFilters: (next: BourbonFilterState) => void;
  /** Merge a partial update into current state — unpatched fields are unchanged. */
  patchFilters: (patch: Partial<BourbonFilterState>) => void;
  /** Reset all filters back to DEFAULT_BOURBON_FILTERS. */
  resetFilters: () => void;
  /**
   * Apply current filter + sort state to a Supabase query builder.
   * Bound to current state — no arguments needed.
   */
  buildSupabaseQuery: (query: FilterableQuery) => FilterableQuery;
  /**
   * Filter and sort collection items client-side using current state.
   * Items must carry a nested `bourbons` object (as returned by useCollection).
   * Bound to current state — no arguments needed.
   */
  filterItems: <T extends { bourbons: unknown }>(items: T[]) => T[];
}

export function useBourbonFilters(): UseBourbonFiltersReturn {
  const [filters, dispatch] = useReducer(filterReducer, DEFAULT_BOURBON_FILTERS);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.proofMin !== null ||
    filters.proofMax !== null ||
    filters.ageMin !== null ||
    filters.ageMax !== null ||
    filters.nasOnly ||
    filters.distillery !== null ||
    filters.sortField !== null;

  const applyFilters = useCallback(
    (next: BourbonFilterState) => dispatch({ type: 'APPLY', next }),
    [],
  );

  const patchFilters = useCallback(
    (patch: Partial<BourbonFilterState>) => dispatch({ type: 'PATCH', patch }),
    [],
  );

  const resetFilters = useCallback(() => dispatch({ type: 'RESET' }), []);

  const buildSupabaseQuery = useCallback(
    (query: FilterableQuery): FilterableQuery => buildBourbonFilterQuery(query, filters),
    [filters],
  );

  const filterItems = useCallback(
    <T extends { bourbons: unknown }>(items: T[]): T[] => filterCollectionItems(items, filters),
    [filters],
  );

  return {
    filters,
    hasActiveFilters,
    applyFilters,
    patchFilters,
    resetFilters,
    buildSupabaseQuery,
    filterItems,
  };
}
