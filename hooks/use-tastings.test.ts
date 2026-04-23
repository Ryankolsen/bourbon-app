/**
 * Unit tests for useLogTasting mutation hook.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked.
 * The SQL triggers are server-side and cannot be unit tested here;
 * these tests verify that the client mutation sends the correct
 * insert payload to Supabase, which will invoke the XP triggers on
 * the live database.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLogTasting } from './use-tastings';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function makeTastingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tasting-uuid-1',
    user_id: 'user-uuid-1',
    bourbon_id: 'bourbon-uuid-1',
    collection_id: null,
    rating: 85,
    nose: 'Vanilla and oak',
    palate: 'Rich caramel',
    finish: 'Long and warming',
    overall_notes: 'Excellent pour',
    tasted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Slice 1: Core wiring — insert reaches Supabase ────────────────────────────

describe('useLogTasting', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: successful insert → select → single chain
    mockSingle.mockResolvedValue({ data: makeTastingRow(), error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('calls supabase.from("tastings").insert() with the tasting payload', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogTasting(), { wrapper: Wrapper });

    const payload = {
      user_id: 'user-uuid-1',
      bourbon_id: 'bourbon-uuid-1',
      rating: 85,
      nose: 'Vanilla and oak',
      palate: 'Rich caramel',
      finish: 'Long and warming',
      overall_notes: 'Excellent pour',
      tasted_at: new Date().toISOString(),
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockFrom).toHaveBeenCalledWith('tastings');
    expect(mockInsert).toHaveBeenCalledWith(payload);
  });

  // ── Slice 2: Content details — all expected fields are present ────────────────

  it('mutation payload includes all required and optional tasting fields', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogTasting(), { wrapper: Wrapper });

    const now = new Date().toISOString();
    const payload = {
      user_id: 'user-uuid-1',
      bourbon_id: 'bourbon-uuid-2',
      rating: 90,
      nose: 'Citrus and spice',
      palate: 'Smooth corn',
      finish: 'Medium dry',
      overall_notes: 'Very enjoyable',
      tasted_at: now,
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    const insertedPayload = mockInsert.mock.calls[0][0];
    expect(insertedPayload).toHaveProperty('user_id', 'user-uuid-1');
    expect(insertedPayload).toHaveProperty('bourbon_id', 'bourbon-uuid-2');
    expect(insertedPayload).toHaveProperty('rating', 90);
    expect(insertedPayload).toHaveProperty('nose', 'Citrus and spice');
    expect(insertedPayload).toHaveProperty('palate', 'Smooth corn');
    expect(insertedPayload).toHaveProperty('finish', 'Medium dry');
    expect(insertedPayload).toHaveProperty('overall_notes', 'Very enjoyable');
    expect(insertedPayload).toHaveProperty('tasted_at', now);
  });

  // ── Slice 3a: Edge case — optional fields null ────────────────────────────────

  it('does not throw when optional fields (nose, palate, finish) are null', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogTasting(), { wrapper: Wrapper });

    const payload = {
      user_id: 'user-uuid-1',
      bourbon_id: 'bourbon-uuid-3',
      rating: 75,
      nose: null,
      palate: null,
      finish: null,
      overall_notes: null,
      tasted_at: new Date().toISOString(),
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(payload);
      })
    ).resolves.not.toThrow();

    expect(mockInsert).toHaveBeenCalledWith(payload);
  });

  // ── Slice 3b: Edge case — Supabase error propagates ──────────────────────────

  it('propagates Supabase errors as a rejected promise', async () => {
    const dbError = { message: 'insert failed', code: '23505' };
    mockSingle.mockResolvedValue({ data: null, error: dbError });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogTasting(), { wrapper: Wrapper });

    const payload = {
      user_id: 'user-uuid-1',
      bourbon_id: 'bourbon-uuid-4',
      tasted_at: new Date().toISOString(),
    };

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toEqual(dbError);
    });
  });
});
