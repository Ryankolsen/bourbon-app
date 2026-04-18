/**
 * Unit tests for useTastingComments hooks.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useTastingComments,
  useCommentCount,
  usePostComment,
} from './use-tasting-comments';

// ── Helpers ────────────────────────────────────────────────────────────────

const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

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

// ── Slice 3a: useTastingComments returns [] when no rows ──────────────────

describe('useTastingComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array when mock returns no rows', async () => {
    const builder: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'order']) {
      builder[m] = jest.fn().mockReturnThis();
    }
    builder['then'] = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    );
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTastingComments('tasting-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('is disabled when tastingId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTastingComments(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.status).toBe('pending');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ── Slice 3b: useCommentCount returns 0 when count is null ────────────────

describe('useCommentCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 0 when count is null', async () => {
    const builder: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq']) {
      builder[m] = jest.fn().mockReturnThis();
    }
    builder['then'] = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: null, count: null }).then(resolve)
    );
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCommentCount('tasting-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });
});

// ── Slice 3c: usePostComment mutation inserts and resolves ────────────────

describe('usePostComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls supabase insert and resolves without error', async () => {
    const builder: Record<string, jest.Mock> = {};
    builder['insert'] = jest.fn().mockReturnThis();
    builder['then'] = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePostComment(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        userId: 'user-1',
        tastingId: 'tasting-1',
        body: 'Great pour!',
      });
    });

    expect(mockFrom).toHaveBeenCalledWith('tasting_comments');
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      tasting_id: 'tasting-1',
      body: 'Great pour!',
    });
  });
});
