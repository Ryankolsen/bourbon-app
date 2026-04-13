import { buildDistillerySearchQuery, DISTILLERY_SEARCH_LIMIT } from './distilleries';
import { createMockSupabaseClient } from './test-utils/supabase';

function makeQueryBuilder(data: unknown[], error: null | { message: string } = null) {
  const qb: Record<string, jest.Mock> = {};
  const methods = ['select', 'ilike', 'not', 'neq', 'order', 'limit'];
  for (const m of methods) {
    qb[m] = jest.fn().mockReturnThis();
  }
  qb['then'] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve),
  );
  return qb;
}

// ---------------------------------------------------------------------------
// Slice 1: core wiring — returns an array of distillery strings
// ---------------------------------------------------------------------------

describe('buildDistillerySearchQuery', () => {
  it('returns an array of distillery name strings for a matching search term', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(
      makeQueryBuilder([{ distillery: 'Buffalo Trace' }, { distillery: 'Wild Turkey' }]),
    );

    const result = await buildDistillerySearchQuery(client as any, 'trace');

    expect(result).toEqual(['Buffalo Trace', 'Wild Turkey']);
  });

  // Slice 2: case-insensitive filtering (handled by the DB query; function returns what DB gives)
  it('returns matching results regardless of case in the data', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(
      makeQueryBuilder([{ distillery: 'Buffalo Trace' }]),
    );

    const result = await buildDistillerySearchQuery(client as any, 'buffalo');

    expect(result).toContain('Buffalo Trace');
  });

  // Slice 3: no matches — empty array
  it('returns an empty array when no bourbons match the search term', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([]));

    const result = await buildDistillerySearchQuery(client as any, 'zzznomatch');

    expect(result).toEqual([]);
  });

  // Slice 4: null and empty distillery values are excluded
  it('excludes null and empty distillery values from results', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(
      makeQueryBuilder([
        { distillery: null },
        { distillery: '' },
        { distillery: 'Buffalo Trace' },
      ]),
    );

    const result = await buildDistillerySearchQuery(client as any, 'buffalo');

    expect(result).toEqual(['Buffalo Trace']);
  });

  // Slice 5: alphabetical order
  it('returns results in alphabetical order', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(
      makeQueryBuilder([
        { distillery: 'Wild Turkey' },
        { distillery: 'Buffalo Trace' },
        { distillery: 'Angel\'s Envy' },
      ]),
    );

    const result = await buildDistillerySearchQuery(client as any, 'e');

    expect(result).toEqual(['Angel\'s Envy', 'Buffalo Trace', 'Wild Turkey']);
  });

  // Slice 6: result count is capped at DISTILLERY_SEARCH_LIMIT
  it('caps results at DISTILLERY_SEARCH_LIMIT when many matches exist', async () => {
    const { client } = createMockSupabaseClient();
    const manyDistilleries = Array.from({ length: DISTILLERY_SEARCH_LIMIT + 5 }, (_, i) => ({
      distillery: `Distillery ${String(i).padStart(3, '0')}`,
    }));
    client.from.mockReturnValueOnce(makeQueryBuilder(manyDistilleries));

    const result = await buildDistillerySearchQuery(client as any, 'distillery');

    expect(result.length).toBe(DISTILLERY_SEARCH_LIMIT);
  });
});
