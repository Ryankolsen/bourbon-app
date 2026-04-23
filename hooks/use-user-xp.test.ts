/**
 * Unit tests for useUserXp hook.
 *
 * Pattern: renderHook + QueryClientProvider wrapper, supabase mocked.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useUserXp } from "./use-user-xp";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();

const mockQueryBuilder = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
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

describe("useUserXp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
  });

  // 1 — core wiring: fetches from user_xp and derives beltName
  it("fetches from user_xp and returns totalXp and beltName", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        user_id: "user-1",
        total_xp: 3500,
        current_belt: 5,
        streak_days: 12,
        last_checkin_date: "2026-04-21",
      },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserXp("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith("user_xp");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result.current.totalXp).toBe(3500);
    expect(result.current.beltName).toBe("Single Barrel");
  });

  // 2a — content details: xpToNextBelt at exact threshold boundary
  it("returns xpToNextBelt === 4500 when total_xp === 3500 (just entered belt 5)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        user_id: "user-1",
        total_xp: 3500,
        current_belt: 5,
        streak_days: 0,
        last_checkin_date: null,
      },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserXp("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Next belt (Small Batch) starts at 8000; 8000 - 3500 = 4500
    expect(result.current.xpToNextBelt).toBe(4500);
    // Exactly at threshold → 0% progress within the belt range
    expect(result.current.progressPercent).toBe(0);
  });

  // 2b — content details: progressPercent midway between two thresholds
  it("returns progressPercent === 50 when halfway between belt 5 and 6 thresholds", async () => {
    // Belt 5 starts at 3500, belt 6 at 8000 → range = 4500
    // Halfway = 3500 + 2250 = 5750
    mockSingle.mockResolvedValueOnce({
      data: {
        user_id: "user-1",
        total_xp: 5750,
        current_belt: 5,
        streak_days: 0,
        last_checkin_date: null,
      },
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserXp("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.progressPercent).toBe(50);
  });

  // 3a — edge case: userId undefined → query not called, isLoading false
  it("returns default state without calling supabase when userId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserXp(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // 3b — edge case: no user_xp row (PGRST116) → defaults to belt 1, 0 XP
  it("returns belt 1 defaults when Supabase returns no row (PGRST116)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "no rows", details: "", hint: "" },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserXp("new-user"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalXp).toBe(0);
    expect(result.current.currentBelt).toBe(1);
    expect(result.current.beltName).toBe("White Dog");
    expect(result.current.streakDays).toBe(0);
    expect(result.current.error).toBeNull();
  });

  // 3c — edge case: Supabase error (non-PGRST116) → error is populated, defaults returned
  it("populates error field when Supabase returns a non-PGRST116 error", async () => {
    const dbError = new Error("network failure");
    mockSingle.mockRejectedValueOnce(dbError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserXp("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeDefined();
    expect(result.current.totalXp).toBe(0);
    expect(result.current.currentBelt).toBe(1);
  });
});
