/**
 * Boundary tests for useBourbonFilters.
 * All tests use renderHook — no external services needed.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useBourbonFilters } from './use-bourbon-filters';
import { DEFAULT_BOURBON_FILTERS, BourbonFilterState, FilterableQuery } from '@/lib/bourbons';

// ---------------------------------------------------------------------------
// Mock query builder
// ---------------------------------------------------------------------------

function makeMockQuery() {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const builder: FilterableQuery = {
    in(col, values) {
      calls.push({ method: 'in', args: [col, values] });
      return builder;
    },
    gte(col, value) {
      calls.push({ method: 'gte', args: [col, value] });
      return builder;
    },
    lte(col, value) {
      calls.push({ method: 'lte', args: [col, value] });
      return builder;
    },
    is(col, value) {
      calls.push({ method: 'is', args: [col, value] });
      return builder;
    },
    ilike(col, pattern) {
      calls.push({ method: 'ilike', args: [col, pattern] });
      return builder;
    },
    order(col, opts) {
      calls.push({ method: 'order', args: [col, opts] });
      return builder;
    },
  };

  return { builder, calls };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withFilters(overrides: Partial<BourbonFilterState>): BourbonFilterState {
  return { ...DEFAULT_BOURBON_FILTERS, ...overrides };
}

type CollectionItem = { id: string; bourbons: Record<string, unknown> | null };

function makeItem(id: string, bourbons: Record<string, unknown> | null = {}): CollectionItem {
  return { id, bourbons };
}

// ---------------------------------------------------------------------------
// Slice 1 — initial state and hasActiveFilters
// ---------------------------------------------------------------------------

describe('useBourbonFilters', () => {
  it('initialises with DEFAULT_BOURBON_FILTERS and hasActiveFilters === false', () => {
    const { result } = renderHook(() => useBourbonFilters());
    expect(result.current.filters).toEqual(DEFAULT_BOURBON_FILTERS);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Slice 2 — applyFilters: atomic replacement
  // ---------------------------------------------------------------------------

  it('applyFilters replaces all filter fields atomically', () => {
    const { result } = renderHook(() => useBourbonFilters());
    const next = withFilters({ types: ['wheated'], proofMin: 90, sortField: 'proof' });
    act(() => {
      result.current.applyFilters(next);
    });
    expect(result.current.filters).toEqual(next);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Slice 3 — patchFilters: partial merge
  // ---------------------------------------------------------------------------

  it('patchFilters merges partial state and leaves unpatched fields unchanged', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.applyFilters(withFilters({ proofMin: 80, distillery: 'Buffalo Trace' }));
    });
    act(() => {
      result.current.patchFilters({ proofMin: 100 });
    });
    expect(result.current.filters.proofMin).toBe(100);
    expect(result.current.filters.distillery).toBe('Buffalo Trace');
  });

  // ---------------------------------------------------------------------------
  // Slice 4 — resetFilters
  // ---------------------------------------------------------------------------

  it('resetFilters returns state to DEFAULT_BOURBON_FILTERS and clears hasActiveFilters', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => {
      result.current.applyFilters(
        withFilters({ types: ['rye'], proofMin: 90, sortField: 'name' }),
      );
    });
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filters).toEqual(DEFAULT_BOURBON_FILTERS);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Slice 5 — hasActiveFilters for each field
  // ---------------------------------------------------------------------------

  it('hasActiveFilters is true when nasOnly is enabled', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.patchFilters({ nasOnly: true }));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('hasActiveFilters is true when distillery is set', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.patchFilters({ distillery: 'Heaven Hill' }));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('sortAscending alone does not activate hasActiveFilters', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.patchFilters({ sortAscending: false }));
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Slice 6 — buildSupabaseQuery: bound, no args
  // ---------------------------------------------------------------------------

  it('buildSupabaseQuery produces no PostgREST calls when filters are default', () => {
    const { result } = renderHook(() => useBourbonFilters());
    const { builder, calls } = makeMockQuery();
    result.current.buildSupabaseQuery(builder);
    expect(calls).toHaveLength(0);
  });

  it('buildSupabaseQuery applies type filter bound to current state', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.patchFilters({ types: ['wheated', 'rye'] }));
    const { builder, calls } = makeMockQuery();
    result.current.buildSupabaseQuery(builder);
    expect(calls).toContainEqual({ method: 'in', args: ['type', ['wheated', 'rye']] });
  });

  it('buildSupabaseQuery applies .is("age_statement", null) for nasOnly and skips age range', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.applyFilters(withFilters({ nasOnly: true, ageMin: 5, ageMax: 20 })));
    const { builder, calls } = makeMockQuery();
    result.current.buildSupabaseQuery(builder);
    expect(calls).toContainEqual({ method: 'is', args: ['age_statement', null] });
    expect(calls.some((c) => c.method === 'gte' && (c.args as unknown[])[0] === 'age_statement')).toBe(false);
    expect(calls.some((c) => c.method === 'lte' && (c.args as unknown[])[0] === 'age_statement')).toBe(false);
  });

  it('buildSupabaseQuery skips .order for social and avg_rating sorts', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.patchFilters({ sortField: 'social' }));
    const { builder: b1, calls: c1 } = makeMockQuery();
    result.current.buildSupabaseQuery(b1);
    expect(c1.some((c) => c.method === 'order')).toBe(false);

    act(() => result.current.patchFilters({ sortField: 'avg_rating' }));
    const { builder: b2, calls: c2 } = makeMockQuery();
    result.current.buildSupabaseQuery(b2);
    expect(c2.some((c) => c.method === 'order')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Slice 7 — filterItems: bound client-side filtering
  // ---------------------------------------------------------------------------

  it('filterItems returns all items when no filters are active', () => {
    const { result } = renderHook(() => useBourbonFilters());
    const items = [
      makeItem('a', { type: 'wheated', proof: 90, age_statement: 12 }),
      makeItem('b', { type: 'rye', proof: 110, age_statement: null }),
    ];
    expect(result.current.filterItems(items)).toEqual(items);
  });

  it('filterItems filters by type', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() => result.current.patchFilters({ types: ['wheated'] }));
    const items = [
      makeItem('a', { type: 'wheated' }),
      makeItem('b', { type: 'rye' }),
    ];
    const filtered = result.current.filterItems(items);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('a');
  });

  it('filterItems: nasOnly excludes items with age_statement and ignores age range', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() =>
      result.current.applyFilters(withFilters({ nasOnly: true, ageMin: 5, ageMax: 20 })),
    );
    const items = [
      makeItem('nas', { age_statement: null }),
      makeItem('aged', { age_statement: 12 }),
    ];
    const filtered = result.current.filterItems(items);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('nas');
  });

  it('nasOnly overrides age range identically in buildSupabaseQuery and filterItems', () => {
    const { result } = renderHook(() => useBourbonFilters());
    act(() =>
      result.current.applyFilters(withFilters({ nasOnly: true, ageMin: 5, ageMax: 20 })),
    );

    // buildSupabaseQuery: is null, no gte/lte on age_statement
    const { builder, calls } = makeMockQuery();
    result.current.buildSupabaseQuery(builder);
    const hasAgeIs = calls.some((c) => c.method === 'is' && (c.args as unknown[])[0] === 'age_statement');
    const hasAgeGte = calls.some((c) => c.method === 'gte' && (c.args as unknown[])[0] === 'age_statement');
    expect(hasAgeIs).toBe(true);
    expect(hasAgeGte).toBe(false);

    // filterItems: NAS item passes, aged item does not
    const items = [makeItem('nas', { age_statement: null }), makeItem('aged', { age_statement: 12 })];
    const filtered = result.current.filterItems(items);
    expect(filtered.map((i) => i.id)).toEqual(['nas']);
  });
});
