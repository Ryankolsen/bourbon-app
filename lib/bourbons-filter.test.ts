/**
 * Unit tests for buildBourbonFilterQuery.
 *
 * Uses a thin mock query builder that records every method call so we can
 * assert which Supabase constraints were (and weren't) applied.
 */

import {
  buildBourbonFilterQuery,
  DEFAULT_BOURBON_FILTERS,
  BourbonFilterState,
  BourbonTypeValue,
  BOURBON_TYPES,
  FilterableQuery,
} from './bourbons';

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

function withFilters(overrides: Partial<BourbonFilterState>): BourbonFilterState {
  return { ...DEFAULT_BOURBON_FILTERS, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildBourbonFilterQuery', () => {
  // 1. Identity case — no active filters leaves query unchanged
  it('returns query unchanged when no filters are active', () => {
    const { builder, calls } = makeMockQuery();
    const result = buildBourbonFilterQuery(builder, DEFAULT_BOURBON_FILTERS);
    expect(result).toBe(builder);
    expect(calls).toHaveLength(0);
  });

  // 2. Single type selected
  it('applies .in("type", [...]) for a single selected type', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ types: ['wheated'] }));
    expect(calls).toContainEqual({ method: 'in', args: ['type', ['wheated']] });
  });

  // 3. Multiple types selected
  it('passes all selected types to .in("type", [...])', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ types: ['rye', 'high_rye'] }));
    expect(calls).toContainEqual({ method: 'in', args: ['type', ['rye', 'high_rye']] });
  });

  // 4. Type + proof composition
  it('applies both .in("type") and .gte(".proof") when type and proofMin are set', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ types: ['small_batch'], proofMin: 90 }));
    expect(calls).toContainEqual({ method: 'in', args: ['type', ['small_batch']] });
    expect(calls).toContainEqual({ method: 'gte', args: ['proof', 90] });
  });

  // 5. All 10 type values
  it('passes all 10 BourbonTypeValue entries to .in("type") when all are selected', () => {
    const { builder, calls } = makeMockQuery();
    const allValues = BOURBON_TYPES.map((t) => t.value) as BourbonTypeValue[];
    buildBourbonFilterQuery(builder, withFilters({ types: allValues }));
    expect(calls).toContainEqual({ method: 'in', args: ['type', allValues] });
  });

  // 6. Proof min
  it('applies .gte("proof", min) when proofMin is set', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ proofMin: 90 }));
    expect(calls).toContainEqual({ method: 'gte', args: ['proof', 90] });
  });

  // 5. Proof max
  it('applies .lte("proof", max) when proofMax is set', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ proofMax: 110 }));
    expect(calls).toContainEqual({ method: 'lte', args: ['proof', 110] });
  });

  // 6. Both proof bounds
  it('applies both .gte and .lte when proof range is fully set', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ proofMin: 90, proofMax: 110 }));
    expect(calls).toContainEqual({ method: 'gte', args: ['proof', 90] });
    expect(calls).toContainEqual({ method: 'lte', args: ['proof', 110] });
  });

  // 7. Distillery
  it('applies .ilike("distillery", "%value%") when distillery is set', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ distillery: 'Buffalo Trace' }));
    expect(calls).toContainEqual({
      method: 'ilike',
      args: ['distillery', '%Buffalo Trace%'],
    });
  });

  // 8. Age min
  it('applies .gte("age_statement", min) when ageMin > 0', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ ageMin: 12 }));
    expect(calls).toContainEqual({ method: 'gte', args: ['age_statement', 12] });
  });

  // 9. NAS toggle overrides age range
  it('applies .is("age_statement", null) when nasOnly is true and ignores age range', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(
      builder,
      withFilters({ nasOnly: true, ageMin: 5, ageMax: 20 }),
    );
    expect(calls).toContainEqual({ method: 'is', args: ['age_statement', null] });
    // ageMin and ageMax must NOT be applied
    expect(calls).not.toContainEqual(
      expect.objectContaining({ method: 'gte', args: expect.arrayContaining(['age_statement']) }),
    );
    expect(calls).not.toContainEqual(
      expect.objectContaining({ method: 'lte', args: expect.arrayContaining(['age_statement']) }),
    );
  });

  // 10. Sort
  it('applies .order(field, { ascending }) when sortField is set', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ sortField: 'proof', sortAscending: false }));
    expect(calls).toContainEqual({
      method: 'order',
      args: ['proof', { ascending: false }],
    });
  });

  // 11. All filters simultaneously
  it('composes all constraints when every filter is active', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, {
      types: ['wheated', 'rye'],
      proofMin: 90,
      proofMax: 120,
      ageMin: 8,
      ageMax: 20,
      nasOnly: false,
      distillery: 'Buffalo Trace',
      sortField: 'name',
      sortAscending: true,
    });

    expect(calls).toContainEqual({ method: 'in', args: ['type', ['wheated', 'rye']] });
    expect(calls).toContainEqual({ method: 'gte', args: ['proof', 90] });
    expect(calls).toContainEqual({ method: 'lte', args: ['proof', 120] });
    expect(calls).toContainEqual({ method: 'gte', args: ['age_statement', 8] });
    expect(calls).toContainEqual({ method: 'lte', args: ['age_statement', 20] });
    expect(calls).toContainEqual({ method: 'ilike', args: ['distillery', '%Buffalo Trace%'] });
    expect(calls).toContainEqual({ method: 'order', args: ['name', { ascending: true }] });
  });

  // Edge: sortField null → no .order call
  it('does not call .order when sortField is null', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ sortField: null }));
    expect(calls.some((c) => c.method === 'order')).toBe(false);
  });

  // Edge: empty distillery string → no .ilike call
  it('does not call .ilike when distillery is null', () => {
    const { builder, calls } = makeMockQuery();
    buildBourbonFilterQuery(builder, withFilters({ distillery: null }));
    expect(calls.some((c) => c.method === 'ilike')).toBe(false);
  });
});
