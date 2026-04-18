/**
 * Unit tests for useSocialNotifications, useDismissSocialNotification,
 * and useSocialNotificationsRealtime hooks.
 *
 * Pattern: renderHook + QueryClientProvider, supabase mocked, one test per slice.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSocialNotifications,
  useDismissSocialNotification,
  useSocialNotificationsRealtime,
} from './use-social-notifications';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEq = jest.fn().mockReturnThis();
const mockIs = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockThen = jest.fn((resolve: (v: any) => void) =>
  Promise.resolve({ data: null, error: null }).then(resolve)
);

const mockQueryBuilder = {
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  then: mockThen,
};

const mockFrom = jest.fn((_table: string) => mockQueryBuilder);

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

// ── useSocialNotifications ────────────────────────────────────────────────────

describe('useSocialNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    );
  });

  // Slice 1 — core wiring: returns a new_follower notification
  it('returns one new_follower notification row', async () => {
    const mockRows = [
      {
        id: 'notif-1',
        recipient_id: 'user-1',
        actor_id: 'actor-1',
        type: 'new_follower',
        tasting_id: null,
        created_at: '2024-01-20T10:00:00Z',
        dismissed_at: null,
        profiles: { display_name: 'Alice', username: 'alice', avatar_url: null },
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: mockRows, error: null }).then(resolve)
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSocialNotifications('user-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].type).toBe('new_follower');
  });

  // Slice 2 — disabled when userId is undefined
  it('does not query supabase when userId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSocialNotifications(undefined), {
      wrapper: Wrapper,
    });
    expect(result.current.isPending).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // Slice 3 — filters on dismissed_at IS NULL
  it('filters out dismissed rows via is("dismissed_at", null)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSocialNotifications('user-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIs).toHaveBeenCalledWith('dismissed_at', null);
  });

  // Slice 4 — queries the social_notifications table
  it('queries the social_notifications table', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSocialNotifications('user-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('social_notifications');
  });
});

// ── useDismissSocialNotification ──────────────────────────────────────────────

describe('useDismissSocialNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockThen.mockImplementation((resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    );
  });

  // Slice 1 — idle before mutation fires
  it('returns idle status before mutation is called', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDismissSocialNotification('user-1'), {
      wrapper: Wrapper,
    });
    expect(result.current.status).toBe('idle');
  });

  // Slice 2 — calls supabase update with dismissed_at
  it('updates dismissed_at on the target notification row', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDismissSocialNotification('user-1'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ notificationId: 'notif-1' });
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('social_notifications'));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ dismissed_at: expect.any(String) })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'notif-1');
  });

  // Slice 3 — optimistic update removes the row immediately
  it('applies optimistic update removing the dismissed notification', async () => {
    const existingNotifications = [
      {
        id: 'notif-1',
        recipient_id: 'user-1',
        actor_id: 'actor-1',
        type: 'new_follower' as const,
        tasting_id: null,
        created_at: '2024-01-20T10:00:00Z',
        dismissed_at: null,
        profiles: { display_name: 'Alice', username: 'alice', avatar_url: null },
      },
      {
        id: 'notif-2',
        recipient_id: 'user-1',
        actor_id: 'actor-2',
        type: 'new_tasting' as const,
        tasting_id: 'tasting-1',
        created_at: '2024-01-20T11:00:00Z',
        dismissed_at: null,
        profiles: { display_name: 'Bob', username: 'bob', avatar_url: null },
      },
    ];

    const { Wrapper, qc } = createWrapper();
    qc.setQueryData(['social-notifications', 'user-1'], existingNotifications);

    const { result } = renderHook(() => useDismissSocialNotification('user-1'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ notificationId: 'notif-1' });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cached = qc.getQueryData<any[]>(['social-notifications', 'user-1']);
    expect(cached?.find((n) => n.id === 'notif-1')).toBeUndefined();
    expect(cached?.find((n) => n.id === 'notif-2')).toBeDefined();
  });
});

// ── useSocialNotificationsRealtime ────────────────────────────────────────────

describe('useSocialNotificationsRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockImplementation((_event: string, _filter: unknown, _cb: unknown) => mockChannel);
    mockSubscribe.mockReturnThis();
  });

  // Slice 1 — no channel when userId is undefined
  it('does not create a realtime channel when userId is undefined', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useSocialNotificationsRealtime(undefined, jest.fn()), {
      wrapper: Wrapper,
    });
    expect(mockChannelFn).not.toHaveBeenCalled();
  });

  // Slice 2 — subscribes to social_notifications for the given userId
  it('creates a channel and subscribes when userId is defined', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useSocialNotificationsRealtime('user-1', jest.fn()), {
      wrapper: Wrapper,
    });
    expect(mockChannelFn).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', table: 'social_notifications' }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  // Slice 3 — calls onInsert callback on INSERT event
  it('calls the onInsert callback with the event payload on INSERT', () => {
    const { Wrapper } = createWrapper();
    const onInsert = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedCallback: ((payload: any) => void) | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOn.mockImplementation((_event: string, _filter: unknown, cb: any) => {
      capturedCallback = cb;
      return mockChannel;
    });

    renderHook(() => useSocialNotificationsRealtime('user-1', onInsert), {
      wrapper: Wrapper,
    });

    expect(capturedCallback).not.toBeNull();
    const fakePayload = {
      new: {
        id: 'notif-1',
        recipient_id: 'user-1',
        actor_id: 'actor-1',
        type: 'new_follower',
        tasting_id: null,
        created_at: '2024-01-20T10:00:00Z',
        dismissed_at: null,
      },
    };
    act(() => {
      capturedCallback!(fakePayload);
    });

    expect(onInsert).toHaveBeenCalledWith(fakePayload.new);
  });

  // Slice 4 — removes the channel on unmount
  it('removes the realtime channel when the hook unmounts', () => {
    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(
      () => useSocialNotificationsRealtime('user-1', jest.fn()),
      { wrapper: Wrapper }
    );
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
