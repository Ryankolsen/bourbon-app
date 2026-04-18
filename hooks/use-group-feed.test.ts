/**
 * Unit tests for useGroupFeed and useShareTastingToGroup.
 *
 * Pattern: renderHook + QueryClientProvider, supabase mocked,
 * one slice at a time (red → green → next slice).
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGroupFeed, useShareTastingToGroup } from './use-group-feed';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: null | object = null) {
  const builder: Record<string, jest.Mock> = {};
  for (const m of ['select', 'eq', 'order', 'insert']) {
    builder[m] = jest.fn().mockReturnThis();
  }
  builder['then'] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve)
  );
  return builder;
}

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

// ── Slice 1: useGroupFeed returns empty array when no rows ────────────────────

describe('useGroupFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when the query returns no rows', async () => {
    mockFrom.mockReturnValue(makeBuilder([]));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupFeed('group-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  // ── Slice 2: surfaces error from supabase ─────────────────────────────────

  it('sets isError when supabase returns an error', async () => {
    mockFrom.mockReturnValue(makeBuilder(null, { message: 'network error' }));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupFeed('group-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  // ── Slice 3: disabled when groupId is undefined ───────────────────────────

  it('is disabled when groupId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupFeed(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.status).toBe('pending');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── Slice 4: maps rows to GroupFeedItem shape ─────────────────────────────

  it('maps returned rows to GroupFeedItem with bourbon_name and sharer username', async () => {
    const rows = [
      {
        id: 'gfi-1',
        group_id: 'group-1',
        tasting_id: 'tasting-1',
        shared_by_user_id: 'user-sharer',
        created_at: '2024-02-01T00:00:00Z',
        tastings: {
          id: 'tasting-1',
          user_id: 'user-taster',
          bourbon_id: 'bourbon-1',
          rating: 9,
          tasted_at: '2024-01-30T00:00:00Z',
          nose: null,
          palate: null,
          finish: null,
          overall_notes: null,
          collection_id: null,
          bourbons: { name: 'Pappy Van Winkle' },
          profiles: { display_name: 'Taster One', username: 'tasterone', avatar_url: null },
        },
        sharer: { display_name: 'Sharer Two', username: 'sharertwo', avatar_url: null },
      },
    ];
    mockFrom.mockReturnValue(makeBuilder(rows));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupFeed('group-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    const item = result.current.data![0];
    expect(item.bourbon_name).toBe('Pappy Van Winkle');
    expect(item.sharer_username).toBe('sharertwo');
    expect(item.taster_display_name).toBe('Taster One');
    expect(item.rating).toBe(9);
  });
});

// ── useShareTastingToGroup ────────────────────────────────────────────────────

describe('useShareTastingToGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls supabase insert into group_feed_items and resolves without error', async () => {
    const builder = makeBuilder(null);
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useShareTastingToGroup(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        tastingId: 'tasting-1',
        groupId: 'group-1',
        sharedByUserId: 'user-1',
      });
    });

    expect(mockFrom).toHaveBeenCalledWith('group_feed_items');
    expect(builder.insert).toHaveBeenCalledWith({
      tasting_id: 'tasting-1',
      group_id: 'group-1',
      shared_by_user_id: 'user-1',
    });
  });
});
