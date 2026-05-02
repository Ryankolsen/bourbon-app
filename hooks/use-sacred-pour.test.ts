/**
 * Unit tests for useSacredPour hook.
 *
 * Pattern: renderHook + QueryClientProvider wrapper.
 * Mocks: @/lib/supabase (module-level), KataSequenceGenerator.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSacredPour } from './use-sacred-pour';
import type { KataSequenceResult } from '@/lib/kata-sequence-generator';

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

// ── KataSequenceGenerator mock ────────────────────────────────────────────────

const mockGenerateKataSequence = jest.fn();

jest.mock('@/lib/kata-sequence-generator', () => ({
  generateKataSequence: (...args: unknown[]) =>
    mockGenerateKataSequence(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_BOURBON = {
  id: 'b1',
  name: 'Buffalo Trace',
  distillery: 'Buffalo Trace Distillery',
  type: 'Kentucky Straight Bourbon',
  proof: 90,
  age_statement: null,
  mashbill: null,
  msrp: null,
  image_url: null,
  description: null,
  city: null,
  state: null,
  country: null,
  submitted_by: null,
  updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Training difficulty: sequence length 3, 2 distractors
const MOCK_KATA: KataSequenceResult = {
  bourbon: MOCK_BOURBON,
  sequence: ['vanilla', 'caramel', 'oak'],
  cards: ['vanilla', 'caramel', 'oak', 'cherry', 'smoke'],
  distractors: ['cherry', 'smoke'],
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
    data: [{ quote: 'The sequence flows through you.' }],
    error: null,
  });
  // award_xp RPC
  mockRpc.mockResolvedValue({
    data: [{ xp_awarded: 100, promoted: false, new_belt: 3 }],
    error: null,
  });
  // KataSequenceGenerator
  mockGenerateKataSequence.mockResolvedValue(MOCK_KATA);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSacredPour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    setupDefaultMocks();
  });

  // ── 1. Core wiring ──────────────────────────────────────────────────────────

  it('auto-starts loading when difficulty is provided, then reaches reveal', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    // Initial state before the auto-start effect fires
    expect(
      result.current.state === 'difficulty_select' ||
        result.current.state === 'loading',
    ).toBe(true);

    await waitFor(() => expect(result.current.state).toBe('reveal'));

    expect(mockGenerateKataSequence).toHaveBeenCalledWith(
      3,
      'standard',
      expect.anything(),
    );
    expect(result.current.bourbon).toEqual(MOCK_BOURBON);
    expect(result.current.sequence).toEqual(['vanilla', 'caramel', 'oak']);
  });

  it('transitions difficulty_select → loading → reveal via selectDifficulty', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSacredPour({ userId: 'u1', beltLevel: 3 }),
      { wrapper: Wrapper },
    );

    expect(result.current.state).toBe('difficulty_select');

    await act(async () => {
      await result.current.selectDifficulty('standard');
    });

    expect(result.current.state).toBe('reveal');
    expect(result.current.difficulty).toBe('standard');
  });

  // ── 2. State transitions ────────────────────────────────────────────────────

  it('advanceToPlayback transitions reveal → playback', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));

    act(() => {
      result.current.advanceToPlayback();
    });

    expect(result.current.state).toBe('playback');
  });

  it('advanceToGrid transitions playback → grid', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));

    act(() => {
      result.current.advanceToPlayback();
    });
    act(() => {
      result.current.advanceToGrid();
    });

    expect(result.current.state).toBe('grid');
    expect(result.current.cards).toEqual(MOCK_KATA.cards);
  });

  // ── 3. Content details ──────────────────────────────────────────────────────

  it('tapCard adds cards to playerSequence; undo removes the last', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });

    expect(result.current.playerSequence).toEqual(['vanilla', 'caramel']);

    act(() => { result.current.undo(); });

    expect(result.current.playerSequence).toEqual(['vanilla']);
  });

  it('tapCard is a no-op once the tray is full (sequence.length reached)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    // Fill tray (sequence length = 3)
    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });
    act(() => { result.current.tapCard('oak'); });
    // Overflow tap — should be ignored
    act(() => { result.current.tapCard('cherry'); });

    expect(result.current.playerSequence).toHaveLength(3);
    expect(result.current.playerSequence).toEqual(['vanilla', 'caramel', 'oak']);
  });

  it('submitSequence with perfect answer → outcome=perfect, xpEarned=100 (standard)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    // Correct sequence: ['vanilla', 'caramel', 'oak']
    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });
    act(() => { result.current.tapCard('oak'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(result.current.state).toBe('scoring');
    expect(result.current.verdict?.outcome).toBe('perfect');
    expect(result.current.verdict?.xpEarned).toBe(100); // 100 × 1.0
    expect(result.current.verdict?.correctCount).toBe(3);
    expect(result.current.verdict?.accuracy).toBe(1);
  });

  it('submitSequence with partial answer → outcome=partial, XP proportional to accuracy', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    // Correct: vanilla; wrong: smoke (should be caramel); wrong: cherry (should be oak)
    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('smoke'); });
    act(() => { result.current.tapCard('cherry'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(result.current.verdict?.outcome).toBe('partial');
    expect(result.current.verdict?.correctCount).toBe(1);
    // accuracy = 1/3 ≈ 0.333; XP = max(floor(10*1.0), floor(80*1.0*0.333)) = max(10, 26) = 26
    expect(result.current.verdict?.xpEarned).toBe(
      Math.round(80 * (1 / 3)),
    );
  });

  it('submitSequence with all wrong → outcome=fail, xpEarned = floor XP × multiplier', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    // All wrong
    act(() => { result.current.tapCard('smoke'); });
    act(() => { result.current.tapCard('cherry'); });
    act(() => { result.current.tapCard('smoke'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(result.current.verdict?.outcome).toBe('fail');
    expect(result.current.verdict?.xpEarned).toBe(10); // floor 10 × 1.0
    expect(result.current.verdict?.correctCount).toBe(0);
  });

  // ── 4. Edge cases ───────────────────────────────────────────────────────────

  it('challenge difficulty applies 1.5× multiplier to XP on perfect', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'challenge' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });
    act(() => { result.current.tapCard('oak'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(result.current.verdict?.xpEarned).toBe(Math.round(100 * 1.5)); // 150
  });

  it('training difficulty applies 0.5× multiplier to XP on perfect', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'training' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });
    act(() => { result.current.tapCard('oak'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(result.current.verdict?.xpEarned).toBe(Math.round(100 * 0.5)); // 50
  });

  it('calls award_xp with sacred_pour_perfect on perfect sequence', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });
    act(() => { result.current.tapCard('oak'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'award_xp',
      expect.objectContaining({
        p_user_id: 'u1',
        p_event_type: 'sacred_pour_perfect',
        p_xp_amount: 100,
      }),
    );
  });

  it('calls award_xp with sacred_pour_complete on partial or fail sequence', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    // All wrong → fail
    act(() => { result.current.tapCard('smoke'); });
    act(() => { result.current.tapCard('cherry'); });
    act(() => { result.current.tapCard('smoke'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'award_xp',
      expect.objectContaining({
        p_user_id: 'u1',
        p_event_type: 'sacred_pour_complete',
        p_xp_amount: 10,
      }),
    );
  });

  it('calls recordPlay (upserts game_daily_sessions) with xpEarned after scoring', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSacredPour({ userId: 'u1', beltLevel: 3, difficulty: 'standard' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.state).toBe('reveal'));
    act(() => { result.current.advanceToPlayback(); });
    act(() => { result.current.advanceToGrid(); });

    act(() => { result.current.tapCard('vanilla'); });
    act(() => { result.current.tapCard('caramel'); });
    act(() => { result.current.tapCard('oak'); });

    await act(async () => {
      await result.current.submitSequence();
    });

    await waitFor(() => expect(result.current.state).toBe('scoring'));

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        game_type: 'sacred_pour',
        xp_earned: expect.any(Number),
      }),
    );
  });
});
