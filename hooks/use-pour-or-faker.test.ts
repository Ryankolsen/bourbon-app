/**
 * Unit tests for usePourOrFaker hook.
 *
 * Pattern: renderHook + QueryClientProvider wrapper.
 * Mocks: @/lib/supabase (module-level), @/lib/faker-names.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePourOrFaker } from './use-pour-or-faker';

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockRpc = jest.fn();
const mockSingle = jest.fn();
const mockUpsert = jest.fn();
const mockLimit = jest.fn();
const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();

const mockQueryBuilder = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  upsert: mockUpsert,
  limit: mockLimit,
};

const mockFrom = jest.fn((_table: string) => mockQueryBuilder);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// ── faker-names mock ──────────────────────────────────────────────────────────

const MOCK_REAL_NAMES = [
  'Buffalo Trace',
  'Pappy Van Winkle',
  'Eagle Rare',
  'Blanton\'s',
  'Four Roses',
];

const MOCK_FAKE_NAMES_BY_TIER: Record<string, string[]> = {
  training: ['Corn Juice Premium', 'Uncle Bob\'s Brown Liquor', 'Good Times Bourbon Flavor'],
  standard: ['Ridgeline Small Batch', 'Millstone 12 Year', 'Blue Ridge Reserve'],
  challenge: ['Four Roses OESK Limited', 'Buffalo Trace Wheat Mash #27', 'Heaven Hill 18 Year BiB'],
};

const mockGetFakesForDifficulty = jest.fn((difficulty: string) => MOCK_FAKE_NAMES_BY_TIER[difficulty] ?? []);

jest.mock('@/lib/faker-names', () => ({
  getFakesForDifficulty: (d: string) => mockGetFakesForDifficulty(d),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper, qc };
}

function setupDefaultMocks() {
  // game_daily_sessions — fresh day (5 plays remaining)
  mockSingle.mockResolvedValue({
    data: { plays_used: 0, xp_earned: 0 },
    error: null,
  });
  // upsert for recordPlay
  mockUpsert.mockResolvedValue({ data: null, error: null });
  // bourbons fetch
  mockLimit.mockImplementation(() =>
    Promise.resolve({
      data: MOCK_REAL_NAMES.map((name) => ({ name })),
      error: null,
    }),
  );
  // award_xp RPC
  mockRpc.mockResolvedValue({
    data: [{ xp_awarded: 5, promoted: false, new_belt: 1 }],
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePourOrFaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    setupDefaultMocks();
  });

  // ── 1. Core wiring ──────────────────────────────────────────────────────────

  it('transitions idle → loading → playing on selectDifficulty', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    expect(result.current.state).toBe('idle');

    act(() => {
      result.current.selectDifficulty('standard');
    });

    expect(result.current.state).toBe('loading');

    await waitFor(() => expect(result.current.state).toBe('playing'));

    expect(result.current.currentCard).toMatchObject({
      name: expect.any(String),
      isReal: expect.any(Boolean),
    });
    expect(result.current.streak).toBe(0);
  });

  it('starts with the correct difficulty set', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('challenge');
    });

    expect(result.current.difficulty).toBe('challenge');
    expect(mockGetFakesForDifficulty).toHaveBeenCalledWith('challenge');
  });

  // ── 2. Correct guess ────────────────────────────────────────────────────────

  it('correct guess increments streak and advances card', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    expect(result.current.state).toBe('playing');
    const firstCard = result.current.currentCard!;

    await act(async () => {
      await result.current.guess(firstCard.isReal ? 'real' : 'fake');
    });

    expect(result.current.streak).toBe(1);
    expect(result.current.state).toBe('playing');
    // Card should have advanced
    expect(result.current.currentCard).not.toBeNull();
  });

  // ── 3. Wrong guess → game_over ──────────────────────────────────────────────

  it('wrong guess transitions to game_over with correct verdict', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    const firstCard = result.current.currentCard!;
    // Intentionally wrong answer
    const wrongAnswer = firstCard.isReal ? 'fake' : 'real';

    await act(async () => {
      await result.current.guess(wrongAnswer);
    });

    expect(result.current.state).toBe('game_over');
    expect(result.current.verdict).toMatchObject({
      streak: 0,
      xpEarned: expect.any(Number),
      wasReal: firstCard.isReal,
      cardName: firstCard.name,
    });
  });

  // ── 4. XP calculation ───────────────────────────────────────────────────────

  it('XP base: training 5, standard 10, challenge 15 per correct guess', async () => {
    for (const [difficulty, xpPerGuess] of [
      ['training', 5],
      ['standard', 10],
      ['challenge', 15],
    ] as const) {
      jest.clearAllMocks();
      setupDefaultMocks();

      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePourOrFaker({ userId: 'u1' }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.selectDifficulty(difficulty);
      });

      // Make 3 correct guesses
      for (let i = 0; i < 3; i++) {
        const card = result.current.currentCard!;
        await act(async () => {
          await result.current.guess(card.isReal ? 'real' : 'fake');
        });
        if (result.current.state === 'game_over') break;
      }

      // Now force a wrong answer to end the game
      if (result.current.state === 'playing') {
        const card = result.current.currentCard!;
        await act(async () => {
          await result.current.guess(card.isReal ? 'fake' : 'real');
        });
      }

      expect(result.current.state).toBe('game_over');
      // 3 correct guesses at xpPerGuess each, no milestones (streak < 5)
      expect(result.current.verdict?.xpEarned).toBe(3 * xpPerGuess);
    }
  });

  it('minimum XP floor: wrong answer on first card → xpEarned === 5', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    const firstCard = result.current.currentCard!;

    await act(async () => {
      await result.current.guess(firstCard.isReal ? 'fake' : 'real');
    });

    expect(result.current.state).toBe('game_over');
    expect(result.current.verdict?.xpEarned).toBe(5); // floor, streak 0 → 0*10=0 → max(5, 0) = 5
  });

  it('milestone bonus: +10 at streak 5 on standard (5 correct → 50 + 10 = 60 XP)', async () => {
    // Ensure queue has at least 6 cards (5 real + 3 fakes = 8 total after shuffle)
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    // Make 5 correct guesses to hit the milestone
    for (let i = 0; i < 5; i++) {
      if (result.current.state !== 'playing') break;
      const card = result.current.currentCard!;
      await act(async () => {
        await result.current.guess(card.isReal ? 'real' : 'fake');
      });
    }

    // Streak should be 5 now; trigger game_over with wrong answer
    if (result.current.state === 'playing') {
      const card = result.current.currentCard!;
      await act(async () => {
        await result.current.guess(card.isReal ? 'fake' : 'real');
      });
    }

    expect(result.current.state).toBe('game_over');
    expect(result.current.verdict?.streak).toBe(5);
    // 5 * 10 + 10 milestone = 60
    expect(result.current.verdict?.xpEarned).toBe(60);
  });

  // ── 5. RPC and recordPlay ───────────────────────────────────────────────────

  it('award_xp RPC called with correct p_xp_amount at game_over', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    const firstCard = result.current.currentCard!;
    await act(async () => {
      await result.current.guess(firstCard.isReal ? 'fake' : 'real');
    });

    expect(result.current.state).toBe('game_over');
    expect(mockRpc).toHaveBeenCalledWith(
      'award_xp',
      expect.objectContaining({
        p_user_id: 'u1',
        p_xp_amount: 5, // floor
      }),
    );
  });

  it('recordPlay called via upsert to game_daily_sessions at game_over', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    const firstCard = result.current.currentCard!;
    await act(async () => {
      await result.current.guess(firstCard.isReal ? 'fake' : 'real');
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        game_type: 'pour_or_faker',
        xp_earned: expect.any(Number),
      }),
    );
  });

  // ── 6. reset ────────────────────────────────────────────────────────────────

  it('reset returns state to idle and clears all values', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePourOrFaker({ userId: 'u1' }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    const firstCard = result.current.currentCard!;
    await act(async () => {
      await result.current.guess(firstCard.isReal ? 'fake' : 'real');
    });

    expect(result.current.state).toBe('game_over');

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.streak).toBe(0);
    expect(result.current.currentCard).toBeNull();
    expect(result.current.verdict).toBeNull();
    expect(result.current.difficulty).toBeNull();
  });
});
