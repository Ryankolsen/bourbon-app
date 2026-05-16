/**
 * Unit tests for useEarnedAchievements hook.
 *
 * Pattern: renderHook + QueryClientProvider, supabase mocked at module level.
 * Single from() call queries user_achievements joined with achievements.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEarnedAchievements } from './use-earned-achievements';

// ── Mock data helpers ────────────────────────────────────────────────────────

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

// ── Supabase mock ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockThen = jest.fn((resolve: (v: any) => void) =>
  Promise.resolve({ data: null, error: null }).then(resolve)
);

const mockUserAchievementsBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  then: mockThen,
};

const mockFrom = jest.fn((_table: string) => mockUserAchievementsBuilder);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
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

// ── useEarnedAchievements ─────────────────────────────────────────────────────

describe('useEarnedAchievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Slice 1 — core wiring: returns only earned achievements
  it('returns only earned achievements', async () => {
    const mockRows = [
      { earned_at: '2026-01-01T00:00:00Z', achievements: makeMockAchievement(0) },
      { earned_at: '2026-01-02T00:00:00Z', achievements: makeMockAchievement(1) },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: mockRows, error: null }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEarnedAchievements('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.achievements).toHaveLength(2);
    expect(result.current.achievements[0].earnedAt).toBe('2026-01-01T00:00:00Z');
    expect(result.current.achievements[1].earnedAt).toBe('2026-01-02T00:00:00Z');
  });

  // Slice 2 — disabled when userId is undefined
  it('does not execute query when userId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEarnedAchievements(undefined), { wrapper: Wrapper });
    expect(result.current.isPending).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
