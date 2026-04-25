/**
 * Unit tests for useGroupSaleAlerts, useCreateSaleAlert, useRemoveSaleAlert.
 *
 * Pattern: renderHook + QueryClientProvider, supabase mocked.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGroupSaleAlerts, useCreateSaleAlert, useRemoveSaleAlert } from './use-sale-alerts';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: null | object = null) {
  const builder: Record<string, jest.Mock> = {};
  for (const m of ['select', 'eq', 'is', 'gte', 'order', 'insert', 'update']) {
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

// ── Slice 1: useGroupSaleAlerts returns empty array when no rows ───────────────

describe('useGroupSaleAlerts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty array when the query returns no rows', async () => {
    mockFrom.mockReturnValue(makeBuilder([]));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupSaleAlerts('group-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  // Slice 2: maps rows to SaleAlert shape
  it('maps returned rows to SaleAlert with bourbon_name and poster username', async () => {
    const rows = [
      {
        id: 'alert-1',
        group_id: 'group-1',
        bourbon_id: 'bourbon-1',
        posted_by: 'user-1',
        price: '$28',
        place_id: 'place-abc',
        place_name: 'Total Wine',
        place_address: '123 Main St',
        note: 'Only 3 left!',
        created_at: new Date().toISOString(),
        removed_at: null,
        removed_by: null,
        bourbons: { id: 'bourbon-1', name: 'Jim Beam Black', distillery: 'Jim Beam' },
        poster: { display_name: 'Ryan K', username: 'ryank', avatar_url: null },
      },
    ];
    mockFrom.mockReturnValue(makeBuilder(rows));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupSaleAlerts('group-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    const alert = result.current.data![0];
    expect(alert.bourbon_name).toBe('Jim Beam Black');
    expect(alert.poster_username).toBe('ryank');
    expect(alert.price).toBe('$28');
    expect(alert.note).toBe('Only 3 left!');
  });

  // Slice 3: disabled when groupId is undefined
  it('is disabled when groupId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupSaleAlerts(undefined), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // Slice 4: filters out expired alerts (older than 30 days)
  it('filters out alerts older than 30 days', async () => {
    const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const rows = [
      {
        id: 'alert-expired',
        group_id: 'group-1',
        bourbon_id: 'bourbon-1',
        posted_by: 'user-1',
        price: '$25',
        place_id: 'place-abc',
        place_name: 'Store',
        place_address: '456 Oak Ave',
        note: null,
        created_at: expiredDate,
        removed_at: null,
        removed_by: null,
        bourbons: { id: 'bourbon-1', name: 'Old Forester', distillery: 'Brown-Forman' },
        poster: { display_name: 'Alice', username: 'alice', avatar_url: null },
      },
    ];
    mockFrom.mockReturnValue(makeBuilder(rows));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupSaleAlerts('group-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});

// ── useCreateSaleAlert ────────────────────────────────────────────────────────

describe('useCreateSaleAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls supabase insert into group_sale_alerts', async () => {
    const builder = makeBuilder(null);
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSaleAlert(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-1',
        bourbonId: 'bourbon-1',
        userId: 'user-1',
        price: '$28',
        placeId: 'place-abc',
        placeName: 'Total Wine',
        placeAddress: '123 Main St',
      });
    });

    expect(mockFrom).toHaveBeenCalledWith('group_sale_alerts');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: 'group-1',
        bourbon_id: 'bourbon-1',
        posted_by: 'user-1',
        price: '$28',
        place_id: 'place-abc',
        place_name: 'Total Wine',
        place_address: '123 Main St',
        note: null,
      })
    );
  });
});

// ── useRemoveSaleAlert ────────────────────────────────────────────────────────

describe('useRemoveSaleAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls supabase update on group_sale_alerts with removed_at and removed_by', async () => {
    const builder = makeBuilder(null);
    mockFrom.mockReturnValue(builder);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveSaleAlert(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        alertId: 'alert-1',
        groupId: 'group-1',
        userId: 'user-1',
      });
    });

    expect(mockFrom).toHaveBeenCalledWith('group_sale_alerts');
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        removed_by: 'user-1',
      })
    );
    expect(builder.eq).toHaveBeenCalledWith('id', 'alert-1');
  });
});
