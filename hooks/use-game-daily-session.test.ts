/**
 * Unit tests for useGameDailySession hook.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked at module level.
 * Follows use-check-in.test.ts / use-user-xp.test.ts conventions.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  DAILY_CAP,
  useGameDailySession,
} from "./use-game-daily-session";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSingle = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();

const mockQueryBuilder = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  upsert: mockUpsert,
};

const mockFrom = jest.fn((_table: string) => mockQueryBuilder);

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { Wrapper, qc };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useGameDailySession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
  });

  // 1 — core wiring: reads game_daily_sessions and returns playsRemaining
  it("returns playsRemaining === DAILY_CAP - plays_used and canPlay === true", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { plays_used: 2, xp_earned: 60 },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession("user-123", "dojo_duel"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith("game_daily_sessions");
    expect(result.current.playsRemaining).toBe(DAILY_CAP - 2);
    expect(result.current.canPlay).toBe(true);
    expect(result.current.totalPlaysToday).toBe(2);
  });

  // 2a — content details: plays_used === DAILY_CAP → canPlay false, playsRemaining 0
  it("returns canPlay === false and playsRemaining === 0 when plays_used equals DAILY_CAP", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { plays_used: DAILY_CAP, xp_earned: 150 },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession("user-123", "dojo_duel"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canPlay).toBe(false);
    expect(result.current.playsRemaining).toBe(0);
    expect(result.current.totalPlaysToday).toBe(DAILY_CAP);
  });

  // 2b — content details: PGRST116 (no row yet) → fresh day, full cap
  it("returns playsRemaining === DAILY_CAP when no row exists yet (PGRST116)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "no rows", details: "", hint: "" },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession("user-123", "dojo_duel"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.playsRemaining).toBe(DAILY_CAP);
    expect(result.current.canPlay).toBe(true);
    expect(result.current.totalPlaysToday).toBe(0);
  });

  // 3a — edge case: userId null → supabase.from never called, canPlay false, isLoading false
  it("does not call supabase.from and returns canPlay false when userId is null", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession(null, "dojo_duel"),
      { wrapper: Wrapper }
    );

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.canPlay).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.playsRemaining).toBe(0);
  });

  // 3b — edge case: recordPlay called when canPlay is false → upsert NOT called
  it("does not call upsert when recordPlay is called and canPlay is false", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { plays_used: DAILY_CAP, xp_earned: 150 },
      error: null,
    });
    mockUpsert.mockResolvedValue({ data: null, error: null });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession("user-123", "dojo_duel"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.canPlay).toBe(false));

    await act(async () => {
      await result.current.recordPlay(30);
    });

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  // 3c — edge case: recordPlay called when canPlay is true → upsert IS called with incremented values
  it("calls upsert with incremented plays_used when recordPlay is called and canPlay is true", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { plays_used: 2, xp_earned: 60 },
      error: null,
    });
    mockUpsert.mockResolvedValue({ data: null, error: null });
    // After upsert, invalidation triggers a refetch — return updated data
    mockSingle.mockResolvedValue({
      data: { plays_used: 3, xp_earned: 90 },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession("user-123", "dojo_duel"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.totalPlaysToday).toBe(2));

    await act(async () => {
      await result.current.recordPlay(30);
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.plays_used).toBe(3);
    expect(upsertArg.xp_earned).toBe(90);
    expect(upsertArg.user_id).toBe("user-123");
    expect(upsertArg.game_type).toBe("dojo_duel");
  });

  // 3d — edge case: resetTime is midnight tonight (a Date in the future)
  it("returns resetTime as a Date set to midnight tonight in local time", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { plays_used: 1, xp_earned: 30 },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGameDailySession("user-123", "dojo_duel"),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const resetTime = result.current.resetTime;
    expect(resetTime).toBeInstanceOf(Date);
    expect(resetTime.getHours()).toBe(0);
    expect(resetTime.getMinutes()).toBe(0);
    expect(resetTime.getSeconds()).toBe(0);
    expect(resetTime.getTime()).toBeGreaterThan(Date.now());
  });
});
