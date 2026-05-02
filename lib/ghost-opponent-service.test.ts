/**
 * Unit tests for GhostOpponentService.
 *
 * Pattern: pass a mock supabase client directly (no module-level mock needed).
 * Query builder chains are thenable — mock `then` to control resolved data.
 */

import {
  fetchGhost,
  saveGhostRun,
  type GhostRun,
  type RoundResult,
} from './ghost-opponent-service';
import { createMockSupabaseClient } from './test-utils/supabase';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeGhostRun(overrides: {
  id?: string;
  user_id?: string | null;
  belt_level?: number;
  difficulty?: 'training' | 'standard' | 'challenge';
}): GhostRun {
  return {
    id: overrides.id ?? 'ghost-1',
    user_id: overrides.user_id !== undefined ? overrides.user_id : 'other-user-1',
    belt_level: overrides.belt_level ?? 4,
    difficulty: overrides.difficulty ?? 'standard',
    round_results: {
      round1: { correct: true, time_ms: 1200 },
      round2: { correct: false, time_ms: 2100 },
      round3: { correct: true, time_ms: 1800 },
    },
    xp_earned: 50,
    created_at: '2024-01-01T00:00:00Z',
  };
}

// Helper to build a thenable query builder that resolves to { data, error }
function makeQueryBuilder(data: unknown[], error: null | { message: string } = null) {
  const methods = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'not', 'is', 'ilike', 'or', 'insert'];
  const qb: Record<string, jest.Mock> = {};
  for (const m of methods) {
    qb[m] = jest.fn().mockReturnThis();
  }
  qb['then'] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve),
  );
  return qb;
}

// ---------------------------------------------------------------------------
// Slice 1 — Core wiring: fetchGhost returns a ghost within ±1 belt level
// ---------------------------------------------------------------------------

describe('fetchGhost — core wiring', () => {
  it('returns a ghost run when real player runs exist within ±1 belt level', async () => {
    const ghosts = [
      makeGhostRun({ id: 'g1', user_id: 'player-a', belt_level: 4 }),
      makeGhostRun({ id: 'g2', user_id: 'player-b', belt_level: 5 }),
    ];

    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder(ghosts));

    const result = await fetchGhost(4, 'standard', 'current-user', client as any);

    expect(result).not.toBeNull();
    expect([3, 4, 5]).toContain(result!.belt_level);
  });

  it('returns null when the query returns no rows', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([]));

    const result = await fetchGhost(4, 'standard', 'current-user', client as any);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Cold-start fallback: returns seed ghost when no real player runs
// ---------------------------------------------------------------------------

describe('fetchGhost — cold-start fallback', () => {
  it('returns the seeded fallback ghost when only user_id=null rows exist', async () => {
    const seedGhost = makeGhostRun({ id: 'seed-1', user_id: null, belt_level: 4 });

    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([seedGhost]));

    const result = await fetchGhost(4, 'standard', 'current-user', client as any);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('seed-1');
    expect(result!.user_id).toBeNull();
  });

  it('prefers real player runs over seeded ghosts', async () => {
    const seedGhost = makeGhostRun({ id: 'seed-1', user_id: null, belt_level: 4 });
    const realGhost = makeGhostRun({ id: 'real-1', user_id: 'player-a', belt_level: 4 });

    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([seedGhost, realGhost]));

    // Run multiple times to verify randomness doesn't accidentally pick seed
    const results: (GhostRun | null)[] = [];
    for (let i = 0; i < 20; i++) {
      const { client: c } = createMockSupabaseClient();
      c.from.mockReturnValueOnce(makeQueryBuilder([seedGhost, realGhost]));
      results.push(await fetchGhost(4, 'standard', 'current-user', c as any));
    }

    // All 20 should be the real ghost (not the seed) since real runs are preferred
    expect(results.every((r) => r?.user_id !== null)).toBe(true);
    expect(results.every((r) => r?.id === 'real-1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — saveGhostRun: inserts with correct shape
// ---------------------------------------------------------------------------

describe('saveGhostRun — insert shape', () => {
  it('calls supabase insert with correct userId, beltLevel, roundResults, and xpEarned', async () => {
    const { client } = createMockSupabaseClient();
    const qb = makeQueryBuilder([]);
    client.from.mockReturnValueOnce(qb);

    const rounds: RoundResult[] = [
      { round: 1, playerWon: true, responseMs: 1100 },
      { round: 2, playerWon: false, responseMs: 2200 },
      { round: 3, playerWon: true, responseMs: 1500 },
    ];

    await saveGhostRun('user-xyz', 5, 'challenge', rounds, 75, client as any);

    expect(client.from).toHaveBeenCalledWith('duel_ghost_runs');
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-xyz',
        belt_level: 5,
        difficulty: 'challenge',
        xp_earned: 75,
        round_results: {
          round1: { correct: true, time_ms: 1100 },
          round2: { correct: false, time_ms: 2200 },
          round3: { correct: true, time_ms: 1500 },
        },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — Edge case: exclude current user's own runs
// ---------------------------------------------------------------------------

describe('fetchGhost — edge cases', () => {
  it('excludes the current user\'s own ghost runs from the result', async () => {
    const currentUserId = 'current-user-123';
    // Only the current user's run in the pool (plus a seed)
    const ownRun = makeGhostRun({ id: 'own-1', user_id: currentUserId, belt_level: 4 });
    const seedRun = makeGhostRun({ id: 'seed-1', user_id: null, belt_level: 4 });

    const { client } = createMockSupabaseClient();
    // Simulate DB correctly excluding own run (returns only seed)
    client.from.mockReturnValueOnce(makeQueryBuilder([seedRun]));

    const result = await fetchGhost(4, 'standard', currentUserId, client as any);

    // Result should be the seed, not own run
    expect(result?.id).toBe('seed-1');
  });

  it('returns null when fetchGhost query returns an error', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder([], { message: 'DB error' }));

    const result = await fetchGhost(4, 'standard', 'current-user', client as any);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — saveGhostRun swallows insert errors (fire-and-forget)
// ---------------------------------------------------------------------------

describe('saveGhostRun — fire-and-forget', () => {
  it('resolves without throwing when the insert fails', async () => {
    const { client } = createMockSupabaseClient();
    // Make insert throw synchronously via then rejection
    const qb: Record<string, jest.Mock> = {
      insert: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        return Promise.resolve({ data: null, error: { message: 'insert failed' } }).then(resolve, reject);
      }),
    };
    client.from.mockReturnValueOnce(qb);

    const rounds: RoundResult[] = [
      { round: 1, playerWon: true, responseMs: 1000 },
      { round: 2, playerWon: true, responseMs: 1000 },
      { round: 3, playerWon: true, responseMs: 1000 },
    ];

    // Should not throw even though insert returned an error
    await expect(
      saveGhostRun('user-1', 3, 'standard', rounds, 30, client as any),
    ).resolves.toBeUndefined();
  });

  it('resolves without throwing when the insert throws an exception', async () => {
    const { client } = createMockSupabaseClient();
    client.from.mockImplementationOnce(() => {
      throw new Error('network failure');
    });

    const rounds: RoundResult[] = [
      { round: 1, playerWon: false, responseMs: 3000 },
      { round: 2, playerWon: false, responseMs: 3000 },
      { round: 3, playerWon: false, responseMs: 3000 },
    ];

    await expect(
      saveGhostRun('user-1', 3, 'standard', rounds, 10, client as any),
    ).resolves.toBeUndefined();
  });
});
