import { useState, useCallback } from 'react';
import {
  BourbonFilterState,
  DEFAULT_BOURBON_FILTERS,
} from '@/lib/bourbons';

export interface UseBourbonFiltersResult {
  filters: BourbonFilterState;
  setTypes: (types: string[]) => void;
  setProofMin: (min: number | null) => void;
  setProofMax: (max: number | null) => void;
  setAgeMin: (min: number | null) => void;
  setAgeMax: (max: number | null) => void;
  setNasOnly: (nasOnly: boolean) => void;
  setDistillery: (distillery: string | null) => void;
  setSortField: (field: string | null) => void;
  setSortAscending: (ascending: boolean) => void;
  /** true when any filter or sort differs from the defaults */
  hasActiveFilters: boolean;
  /** Reset all filter and sort state back to defaults */
  clearFilters: () => void;
}

/**
 * Encapsulates filter + sort state for a single screen.
 * State is local to the component and resets naturally on unmount.
 */
export function useBourbonFilters(): UseBourbonFiltersResult {
  const [filters, setFilters] = useState<BourbonFilterState>(DEFAULT_BOURBON_FILTERS);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.proofMin !== null ||
    filters.proofMax !== null ||
    filters.ageMin !== null ||
    filters.ageMax !== null ||
    filters.nasOnly ||
    filters.distillery !== null ||
    filters.sortField !== null;

  const clearFilters = useCallback(() => setFilters(DEFAULT_BOURBON_FILTERS), []);

  const setTypes = useCallback(
    (types: string[]) => setFilters((f) => ({ ...f, types })),
    [],
  );
  const setProofMin = useCallback(
    (proofMin: number | null) => setFilters((f) => ({ ...f, proofMin })),
    [],
  );
  const setProofMax = useCallback(
    (proofMax: number | null) => setFilters((f) => ({ ...f, proofMax })),
    [],
  );
  const setAgeMin = useCallback(
    (ageMin: number | null) => setFilters((f) => ({ ...f, ageMin })),
    [],
  );
  const setAgeMax = useCallback(
    (ageMax: number | null) => setFilters((f) => ({ ...f, ageMax })),
    [],
  );
  const setNasOnly = useCallback(
    (nasOnly: boolean) => setFilters((f) => ({ ...f, nasOnly })),
    [],
  );
  const setDistillery = useCallback(
    (distillery: string | null) => setFilters((f) => ({ ...f, distillery })),
    [],
  );
  const setSortField = useCallback(
    (sortField: string | null) => setFilters((f) => ({ ...f, sortField })),
    [],
  );
  const setSortAscending = useCallback(
    (sortAscending: boolean) => setFilters((f) => ({ ...f, sortAscending })),
    [],
  );

  return {
    filters,
    setTypes,
    setProofMin,
    setProofMax,
    setAgeMin,
    setAgeMax,
    setNasOnly,
    setDistillery,
    setSortField,
    setSortAscending,
    hasActiveFilters,
    clearFilters,
  };
}
