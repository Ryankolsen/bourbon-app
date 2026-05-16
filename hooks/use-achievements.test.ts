/**
 * Unit tests for useAchievements and useAchievementsRealtime hooks.
 *
 * Pattern: renderHook + QueryClientProvider, supabase mocked, one test per slice.
 * Two from() calls per query (achievements + user_achievements) — each gets its
 * own builder so we can control the responses independently.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAchievements, useAchievementsRealtime } from './use-achievements';

// ── Helpers for mock achievement rows ────────────────────────────────────────

function makeMockAchievement(i: number) {
  return {
    id: `ach-${i}`,
    key: `achievement_${i}`,
    category: 'tasting' as const,
    tier: null,
    title: `Achievement ${i}`,
    description: `Description ${i}`,
    xp_award: 25,
    trigger_type: 'tasting_count',
    trigger_threshold: 1,
  };
}

const MOCK_ACHIEVEMENTS = Array.from({ length: 29 }, (_, i) => makeMockAchievement(i));

// ── Supabase mock ─────────────────────────────────────────────────────────────

// achievements table builder
const mockAchievementsThen = jest.fn();
const mockAchievementsBuilder = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  then: mockAchievementsThen,
};

// user_achievements table builder
const mockUserAchievementsThen = jest.fn();
const mockUserAchievementsBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  then: mockUserAchievementsThen,
};

const mockFrom = jest.fn((table: string) => {
  if (table === 'user_achievements') return mockUserAchievementsBuilder;
  return mockAchievementsBuilder;
});

// Realtime mocks
const mockSubscribe = jest.fn().mockReturnThis();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOn = jest.fn((_event: string, _filter: unknown, _cb: unknown): typeof mockChannel => mockChannel);
const mockChannel: { on: typeof mockOn; subscribe: typeof mockSubscribe } = {
  on: mockOn,
  subscribe: mockSubscribe,
};
const mockChannelFn = jest.fn((_name: string) => mockChannel);
const mockRemoveChannel = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    channel: (name: string) => mockChannelFn(name),
    removeChannel: (ch: unknown) => mockRemoveChannel(ch),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper, qc };
}

// ── useAchievements ───────────────────────────────────────────────────────────

describe('useAchievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Slice 1 — core wiring: returns empty (no earned) array
  it('returns empty array when no achievements are earned', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAchievementsThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: MOCK_ACHIEVEMENTS, error: null }).then(resolve)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUserAchievementsThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAchievements('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.achievements).toHaveLength(29);
    expect(result.current.achievements.every((a) => a.earnedAt === null)).toBe(true);
  });

  // Slice 2 — content details: marks earned achievements
  it('marks achievement as earned when user_achievements row exists', async () => {
    const singleAch = [makeMockAchievement(0)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAchievementsThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: singleAch, error: null }).then(resolve)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUserAchievementsThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({
        data: [{ achievement_id: 'ach-0', earned_at: '2026-01-01T00:00:00Z' }],
        error: null,
      }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAchievements('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.achievements[0].earnedAt).toBe('2026-01-01T00:00:00Z');
  });

  // Slice 3 — edge case: disabled when userId is undefined
  it('does not execute query when userId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAchievements(undefined), { wrapper: Wrapper });
    expect(result.current.isPending).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ── useAchievementsRealtime ───────────────────────────────────────────────────

describe('useAchievementsRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockImplementation((_event: string, _filter: unknown, _cb: unknown) => mockChannel);
    mockSubscribe.mockReturnThis();
  });

  // Slice 1 — no channel when userId is undefined
  it('does not create a realtime channel when userId is undefined', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useAchievementsRealtime(undefined), { wrapper: Wrapper });
    expect(mockChannelFn).not.toHaveBeenCalled();
  });

  // Slice 2 — subscribes to user_achievements for the given userId
  it('creates a channel and subscribes when userId is defined', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useAchievementsRealtime('user-1'), { wrapper: Wrapper });
    expect(mockChannelFn).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', table: 'user_achievements' }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  // Slice 3 — removes the channel on unmount
  it('removes the realtime channel when the hook unmounts', () => {
    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(() => useAchievementsRealtime('user-1'), {
      wrapper: Wrapper,
    });
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
