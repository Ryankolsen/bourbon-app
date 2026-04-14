/**
 * Unit tests for useBourbonFilters.
 *
 * Pattern: renderHook from @testing-library/react-native, no QueryClient needed
 * since this hook has no async queries — pure local state.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useBourbonFilters } from './use-bourbon-filters';
import { DEFAULT_BOURBON_FILTERS } from '@/lib/bourbons';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBourbonFilters', () => {
  // 12. Initial state
  it('initialises with all defaults and hasActiveFilters === false', () => {
    const { result } = renderHook(() => useBourbonFilters());
    expect(result.current.filters).toEqual(DEFAULT_BOURBON_FILTERS);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // 13. Setting a type makes hasActiveFilters true
  it('sets hasActiveFilters to true when a type is selected', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.setTypes(['Wheated']);
    });
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.filters.types).toEqual(['Wheated']);
  });

  // 14. clearFilters resets everything
  it('clearFilters resets all state back to defaults', () => {
    const { result } = renderHook(() => useBourbonFilters());

    act(() => {
      result.current.setTypes(['Rye']);
      result.current.setProofMin(90);
      result.current.setDistillery('Buffalo Trace');
      result.current.setNasOnly(true);
      result.current.setSortField('proof');
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual(DEFAULT_BOURBON_FILTERS);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // 15. Proof range min and max update independently
  it('sets proofMin and proofMax independently', () => {
    const { result } = renderHook(() => useBourbonFilters());

    act(() => {
      result.current.setProofMin(90);
    });
    expect(result.current.filters.proofMin).toBe(90);
    expect(result.current.filters.proofMax).toBeNull();

    act(() => {
      result.current.setProofMax(120);
    });
    expect(result.current.filters.proofMin).toBe(90);
    expect(result.current.filters.proofMax).toBe(120);
  });

  // Extra: hasActiveFilters reflects nasOnly
  it('sets hasActiveFilters to true when nasOnly is enabled', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.setNasOnly(true);
    });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // Extra: hasActiveFilters reflects distillery
  it('sets hasActiveFilters to true when distillery is set', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.setDistillery('Heaven Hill');
    });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // Extra: hasActiveFilters reflects sortField
  it('sets hasActiveFilters to true when sortField is set', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.setSortField('proof');
    });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // Extra: setSortAscending updates direction without activating hasActiveFilters
  it('setSortAscending alone does not activate hasActiveFilters', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.setSortAscending(false);
    });
    // sortField is still null, so no sort is active
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filters.sortAscending).toBe(false);
  });
});
