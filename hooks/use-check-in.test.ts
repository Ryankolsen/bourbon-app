/**
 * Unit tests for useCheckIn hook.
 *
 * Pattern: renderHook, supabase.rpc mocked.
 * The hook fires once on mount; tests assert shape and edge-case behavior.
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { useCheckIn } from "./use-check-in";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpc = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useCheckIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1 — core wiring: calls rpc('check_in') once on mount
  it("calls supabase.rpc('check_in') exactly once on mount", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("check_in");
  });

  // 2 — content details: hook exposes correct shape after RPC resolves
  it("exposes correct shape after RPC resolves with streak data", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.streakDays).toBe(5);
    expect(result.current.lastXpAwarded).toBe(5);
    expect(result.current.promoted).toBe(false);
    expect(result.current.newBelt).toBe(1);
  });

  // 3a — edge case: xp_awarded = 0 (same-day call, idempotent no-op)
  it("returns lastXpAwarded === 0 when RPC returns same-day no-op", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 0, streak_days: 3, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastXpAwarded).toBe(0);
    expect(result.current.streakDays).toBe(3);
    expect(result.current.isLoading).toBe(false);
  });

  // 3b — edge case: promoted = true, new_belt = 2
  it("exposes promoted and newBelt when RPC returns a promotion", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 7, streak_days: 7, promoted: true, new_belt: 2 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.promoted).toBe(true);
    expect(result.current.newBelt).toBe(2);
    expect(result.current.lastXpAwarded).toBe(7);
  });

  // 3c — edge case: RPC error → isLoading false, no throw
  it("sets isLoading false and does not throw when RPC returns an error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "network error", code: "500" },
    });

    const { result } = renderHook(() => useCheckIn());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Default values preserved on error
    expect(result.current.streakDays).toBe(0);
    expect(result.current.lastXpAwarded).toBe(0);
    expect(result.current.promoted).toBe(false);
    expect(result.current.newBelt).toBe(1);
  });
});
