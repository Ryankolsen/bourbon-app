/**
 * Unit tests for useDojoDuel hook.
 *
 * Pattern: renderHook + QueryClientProvider wrapper.
 * Mocks: @/lib/supabase (module-level), DuelQuestionGenerator, GhostOpponentService.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDojoDuel } from './use-dojo-duel';
import type { DuelQuestionSet } from '@/lib/duel-question-generator';
import type { GhostRun } from '@/lib/ghost-opponent-service';

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

// ── DuelQuestionGenerator mock ────────────────────────────────────────────────

const mockGenerateDuelQuestions = jest.fn();

jest.mock('@/lib/duel-question-generator', () => ({
  generateDuelQuestions: (...args: unknown[]) =>
    mockGenerateDuelQuestions(...args),
}));

// ── GhostOpponentService mock ─────────────────────────────────────────────────

const mockFetchGhost = jest.fn();
const mockSaveGhostRun = jest.fn();

jest.mock('@/lib/ghost-opponent-service', () => ({
  fetchGhost: (...args: unknown[]) => mockFetchGhost(...args),
  saveGhostRun: (...args: unknown[]) => mockSaveGhostRun(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_QUESTIONS: DuelQuestionSet = {
  rounds: [
    {
      type: 'identification',
      bourbonId: 'b1',
      bourbonName: 'Buffalo Trace',
      correctAnswer: 'Buffalo Trace',
      choices: ['Buffalo Trace', "Maker's Mark", 'Wild Turkey', 'Four Roses'],
      dossier: { bourbonType: 'Traditional Bourbon', distillery: 'Buffalo Trace Distillery', state: 'Kentucky', proof: 90 },
    },
    {
      type: 'stat_battle',
      statType: 'proof',
      question: 'What is the proof of Buffalo Trace?',
      correctAnswer: '90',
      choices: ['90', '86', '101', '107'],
    },
    {
      type: 'fake_note',
      bourbonId: 'b1',
      notes: [
        { text: 'Rich vanilla and caramel', isFake: false },
        { text: 'Oak and dried fruit', isFake: false },
        { text: 'Smells like a Roomba', isFake: true },
      ],
    },
  ],
  difficulty: 'standard',
  beltLevel: 3,
};

// Ghost wins rounds 1 and 3, loses round 2
const MOCK_GHOST: GhostRun = {
  id: 'ghost-1',
  user_id: 'other-user',
  belt_level: 3,
  difficulty: 'standard',
  round_results: {
    round1: { correct: true, time_ms: 3000 },
    round2: { correct: false, time_ms: 4000 },
    round3: { correct: true, time_ms: 2000 },
  },
  xp_earned: 40,
  created_at: '2024-01-01T00:00:00Z',
};

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
  // sensei_quotes query
  mockLimit.mockResolvedValue({
    data: [{ quote: 'You disappoint me.' }],
    error: null,
  });
  // award_xp RPC
  mockRpc.mockResolvedValue({
    data: [{ xp_awarded: 40, promoted: false, new_belt: 3 }],
    error: null,
  });
  // DuelQuestionGenerator
  mockGenerateDuelQuestions.mockResolvedValue(MOCK_QUESTIONS);
  // GhostOpponentService
  mockFetchGhost.mockResolvedValue(MOCK_GHOST);
  mockSaveGhostRun.mockResolvedValue(undefined);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDojoDuel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    setupDefaultMocks();
  });

  // ── 1. Core wiring ──────────────────────────────────────────────────────────

  it('auto-starts loading when difficulty is provided, then reaches round_1', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    // Initial state before the auto-start effect fires
    expect(
      result.current.state === 'difficulty_select' ||
        result.current.state === 'loading',
    ).toBe(true);

    // Wait for questions to load
    await waitFor(() => expect(result.current.state).toBe('round_1'));

    expect(mockGenerateDuelQuestions).toHaveBeenCalledWith(
      3,
      'standard',
      expect.anything(),
    );
    expect(mockFetchGhost).toHaveBeenCalledWith(
      3,
      'standard',
      'u1',
      expect.anything(),
    );
    expect(result.current.questions).not.toBeNull();
    expect(result.current.ghost).toEqual(MOCK_GHOST);
  });

  it('transitions difficulty_select → loading → round_1 via selectDifficulty', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDojoDuel({ userId: 'u1', beltLevel: 3 }),
      { wrapper: Wrapper },
    );

    expect(result.current.state).toBe('difficulty_select');

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    expect(result.current.state).toBe('round_1');
    expect(result.current.difficulty).toBe('standard');
  });

  // ── 2. Content details ──────────────────────────────────────────────────────

  it('advances round_1 → round_2 when player answers Round 1 correctly', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });

    expect(result.current.state).toBe('round_2');
  });

  it('reaches verdict with outcome=win and xpEarned=40 when player wins 2 of 3 (standard)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    // Win round 1
    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });
    // Win round 2
    await act(async () => {
      await result.current.submitAnswer('90');
    });
    // Lose round 3 (pick a real note instead of the fake)
    await act(async () => {
      await result.current.submitAnswer('Rich vanilla and caramel');
    });

    expect(result.current.state).toBe('verdict');
    expect(result.current.verdict?.outcome).toBe('win');
    expect(result.current.verdict?.xpEarned).toBe(40);
    expect(result.current.verdict?.playerRoundWins).toBe(2);
  });

  it('reaches verdict with outcome=sweep and xpEarned=75 when player wins all 3', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace'); // Win round 1
    });
    await act(async () => {
      await result.current.submitAnswer('90'); // Win round 2
    });
    await act(async () => {
      await result.current.submitAnswer('Smells like a Roomba'); // Win round 3 (fake)
    });

    expect(result.current.state).toBe('verdict');
    expect(result.current.verdict?.outcome).toBe('sweep');
    expect(result.current.verdict?.xpEarned).toBe(75);
    expect(result.current.verdict?.playerRoundWins).toBe(3);
  });

  it('reaches verdict with outcome=loss and xpEarned=10 when player wins fewer than 2 rounds', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    // Lose all 3 rounds
    await act(async () => {
      await result.current.submitAnswer("Maker's Mark"); // wrong
    });
    await act(async () => {
      await result.current.submitAnswer('86'); // wrong
    });
    await act(async () => {
      await result.current.submitAnswer('Rich vanilla and caramel'); // wrong (real note)
    });

    expect(result.current.state).toBe('verdict');
    expect(result.current.verdict?.outcome).toBe('loss');
    expect(result.current.verdict?.xpEarned).toBe(10);
  });

  // ── 3. Edge cases ───────────────────────────────────────────────────────────

  it('challenge difficulty applies 1.5× multiplier to XP', async () => {
    mockGenerateDuelQuestions.mockResolvedValue({
      ...MOCK_QUESTIONS,
      difficulty: 'challenge',
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'challenge' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    // Sweep for clearest multiplier check: 75 * 1.5 = 112
    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });
    await act(async () => {
      await result.current.submitAnswer('90');
    });
    await act(async () => {
      await result.current.submitAnswer('Smells like a Roomba');
    });

    expect(result.current.verdict?.xpEarned).toBe(
      Math.round(75 * 1.5),
    );
  });

  it('training difficulty applies 0.5× multiplier to XP', async () => {
    mockGenerateDuelQuestions.mockResolvedValue({
      ...MOCK_QUESTIONS,
      difficulty: 'training',
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'training' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    // Win (40 * 0.5 = 20)
    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });
    await act(async () => {
      await result.current.submitAnswer('90');
    });
    await act(async () => {
      await result.current.submitAnswer('Rich vanilla and caramel'); // lose round 3
    });

    expect(result.current.verdict?.xpEarned).toBe(Math.round(40 * 0.5));
  });

  it('calls award_xp RPC with the correct event_type string matching outcome', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    // Sweep
    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });
    await act(async () => {
      await result.current.submitAnswer('90');
    });
    await act(async () => {
      await result.current.submitAnswer('Smells like a Roomba');
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'award_xp',
      expect.objectContaining({
        p_user_id: 'u1',
        p_event_type: 'dojo_duel_sweep',
        p_xp_amount: 75,
      }),
    );
  });

  it('calls recordPlay (upserts game_daily_sessions) with xpEarned after verdict', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    // Win
    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });
    await act(async () => {
      await result.current.submitAnswer('90');
    });
    await act(async () => {
      await result.current.submitAnswer('Rich vanilla and caramel'); // lose r3 → win overall
    });

    await waitFor(() => expect(result.current.state).toBe('verdict'));

    // recordPlay calls upsert on game_daily_sessions
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        game_type: 'dojo_duel',
        xp_earned: expect.any(Number),
      }),
    );
  });

  it('calls saveGhostRun with roundResults after verdict', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useDojoDuel({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('round_1'));

    await act(async () => {
      await result.current.submitAnswer('Buffalo Trace');
    });
    await act(async () => {
      await result.current.submitAnswer('90');
    });
    await act(async () => {
      await result.current.submitAnswer('Smells like a Roomba');
    });

    await waitFor(() => expect(result.current.state).toBe('verdict'));

    expect(mockSaveGhostRun).toHaveBeenCalledWith(
      'u1',
      3,
      'standard',
      expect.arrayContaining([
        expect.objectContaining({ round: 1 }),
        expect.objectContaining({ round: 2 }),
        expect.objectContaining({ round: 3 }),
      ]),
      75,
      expect.anything(),
    );
  });
});
