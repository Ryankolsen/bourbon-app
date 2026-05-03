import { fetchFakeNote, fetchSenseiQuote } from './content-bank';
import { createMockSupabaseClient } from './test-utils/supabase';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeQueryBuilder(data: unknown[], error: null | { message: string } = null) {
  const methods = ['select', 'eq', 'limit', 'order', 'in', 'or', 'neq'];
  const qb: Record<string, jest.Mock> = {};
  for (const m of methods) {
    qb[m] = jest.fn().mockReturnThis();
  }
  qb['then'] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve),
  );
  return qb;
}

function makeFakeNote(overrides: Partial<{ id: string; note: string; difficulty_tier: number }> = {}) {
  return {
    id: overrides.id ?? 'note-1',
    note: overrides.note ?? 'Hints of motor oil and existential dread.',
    difficulty_tier: overrides.difficulty_tier ?? 1,
    created_at: '2024-01-01T00:00:00Z',
  };
}

function makeSenseiQuote(overrides: Partial<{ id: string; quote: string; outcome: string }> = {}) {
  return {
    id: overrides.id ?? 'quote-1',
    quote: overrides.quote ?? 'You disappoint me, as always.',
    outcome: overrides.outcome ?? 'duel_loss',
    created_at: '2024-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// fetchFakeNote
// ---------------------------------------------------------------------------

describe('fetchFakeNote', () => {
  it('returns a note when results exist for the difficulty tier', async () => {
    const { client } = createMockSupabaseClient();
    const note = makeFakeNote({ difficulty_tier: 1 });
    client.from.mockReturnValueOnce(makeQueryBuilder([note]));

    const result = await fetchFakeNote(1, client as any);

    expect(result).not.toBeNull();
    expect(result!.note).toBe(note.note);
    expect(result!.difficulty_tier).toBe(1);
  });

  it('returns null when no notes exist for the difficulty tier', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([]));

    const result = await fetchFakeNote(2, client as any);

    expect(result).toBeNull();
  });

  it('returns null on DB error', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([], { message: 'connection error' }));

    const result = await fetchFakeNote(1, client as any);

    expect(result).toBeNull();
  });

  it('picks randomly from the pool when multiple notes exist', async () => {
    const { client } = createMockSupabaseClient();
    const notes = [
      makeFakeNote({ id: 'note-1', note: 'Note A' }),
      makeFakeNote({ id: 'note-2', note: 'Note B' }),
      makeFakeNote({ id: 'note-3', note: 'Note C' }),
    ];
    client.from.mockReturnValue(makeQueryBuilder(notes));

    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = await fetchFakeNote(1, client as any);
      if (result) seen.add(result.note);
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// fetchSenseiQuote
// ---------------------------------------------------------------------------

describe('fetchSenseiQuote', () => {
  it('returns a quote for a valid outcome', async () => {
    const { client } = createMockSupabaseClient();
    const quote = makeSenseiQuote({ outcome: 'duel_win' });
    client.from.mockReturnValueOnce(makeQueryBuilder([quote]));

    const result = await fetchSenseiQuote('duel_win', client as any);

    expect(result).not.toBeNull();
    expect(result!.quote).toBe(quote.quote);
    expect(result!.outcome).toBe('duel_win');
  });

  it('returns null when no quotes exist for the outcome', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([]));

    const result = await fetchSenseiQuote('pour_perfect', client as any);

    expect(result).toBeNull();
  });

  it('returns null on DB error', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([], { message: 'timeout' }));

    const result = await fetchSenseiQuote('duel_loss', client as any);

    expect(result).toBeNull();
  });

  it('picks randomly from the pool when multiple quotes exist', async () => {
    const { client } = createMockSupabaseClient();
    const quotes = [
      makeSenseiQuote({ id: 'q-1', quote: 'Quote A' }),
      makeSenseiQuote({ id: 'q-2', quote: 'Quote B' }),
      makeSenseiQuote({ id: 'q-3', quote: 'Quote C' }),
    ];
    client.from.mockReturnValue(makeQueryBuilder(quotes));

    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = await fetchSenseiQuote('duel_loss', client as any);
      if (result) seen.add(result.quote);
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});
