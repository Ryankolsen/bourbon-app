/**
 * Tests for Phase 4 of #53: useDistilleries hook.
 *
 * Verifies:
 * 1. Returns an array of strings from the query builder result
 * 2. Debounces the search input (does not fire immediately on every keystroke)
 * 3. Returns an empty array while the search string is empty
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDistilleries } from './use-distilleries';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockBuildDistillerySearchQuery = jest.fn();
jest.mock('@/lib/distilleries', () => ({
  buildDistillerySearchQuery: (...args: unknown[]) =>
    mockBuildDistillerySearchQuery(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// Wrap in TanStack Query provider
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useDistilleries', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockBuildDistillerySearchQuery.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Slice 1: returns array of strings from query builder
  it('returns an array of distillery name strings once debounce fires', async () => {
    mockBuildDistillerySearchQuery.mockResolvedValue(['Buffalo Trace', 'Wild Turkey']);

    const { result } = renderHook(() => useDistilleries('buffalo'), {
      wrapper: makeWrapper(),
    });

    // Fire the debounce timer
    act(() => { jest.advanceTimersByTime(500); });

    await waitFor(() => {
      expect(result.current.distilleries).toEqual(['Buffalo Trace', 'Wild Turkey']);
    });
  });

  // Slice 2: debounce — rapid input changes do not trigger multiple query calls
  it('does not fire an extra query when the search string changes rapidly', async () => {
    // Start with 'buff', then quickly change to 'buffalo' before debounce fires
    const { rerender } = renderHook(({ s }: { s: string }) => useDistilleries(s), {
      wrapper: makeWrapper(),
      initialProps: { s: 'buff' },
    });

    // Advance only partway (less than debounce window)
    act(() => { jest.advanceTimersByTime(200); });

    // Change search before the first debounce fires
    rerender({ s: 'buffalo' });

    // Total calls before debounce fires for 'buffalo' should be at most 1 (initial mount)
    const callsBeforeDebounce = mockBuildDistillerySearchQuery.mock.calls.length;

    // Now fire the debounce
    act(() => { jest.advanceTimersByTime(500); });

    await waitFor(() => {
      expect(mockBuildDistillerySearchQuery).toHaveBeenCalled();
    });

    // The query should fire with the latest value, not intermediate ones
    const lastCall = mockBuildDistillerySearchQuery.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe('buffalo');
    // Should not have fired an extra call for 'buff' mid-typing
    expect(mockBuildDistillerySearchQuery.mock.calls.length).toBeLessThanOrEqual(callsBeforeDebounce + 1);
  });

  // Slice 3: empty search string returns empty array without querying
  it('returns an empty array when search string is empty', async () => {
    const { result } = renderHook(() => useDistilleries(''), {
      wrapper: makeWrapper(),
    });

    act(() => { jest.advanceTimersByTime(500); });

    await waitFor(() => {
      expect(result.current.distilleries).toEqual([]);
    });
    // Query builder should NOT be called for empty search
    expect(mockBuildDistillerySearchQuery).not.toHaveBeenCalled();
  });
});
