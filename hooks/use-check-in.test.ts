/**
 * Unit tests for useCheckIn hook.
 *
 * Pattern: renderHook, supabase.rpc mocked.
 * The hook fires once per non-null userId; tests assert shape and edge-case behavior.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
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

  // 1 — core wiring: calls rpc('check_in') once when userId is a valid string
  it("calls supabase.rpc('check_in') exactly once when userId is a valid string", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn("user-123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("check_in");
    expect(result.current.streakDays).toBe(5);
  });

  // 2 — content details: tomorrowXp is populated from getTomorrowXp
  it("populates tomorrowXp.base === streak_days + 1 after RPC resolves", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn("user-123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tomorrowXp).not.toBeNull();
    expect(result.current.tomorrowXp!.base).toBe(6);
  });

  it("sets milestoneLabel to '7-day streak' when RPC returns streak_days: 6", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 6, streak_days: 6, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn("user-123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tomorrowXp!.milestoneLabel).toBe("7-day streak");
    expect(result.current.tomorrowXp!.bonusXp).toBe(20);
  });

  // 3a — edge case: userId null → rpc never called
  it("does not call supabase.rpc when userId is null", () => {
    const { result } = renderHook(() => useCheckIn(null));

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  // 3b — edge case: userId undefined → rpc never called
  it("does not call supabase.rpc when userId is undefined", () => {
    const { result } = renderHook(() => useCheckIn(undefined));

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  // 3c — edge case: isReset true when streak_days is 1 after a prior streak > 1
  it("sets isReset true when streak_days is 1 and previous streak was > 1", async () => {
    // First call: establish a streak of 5
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result, rerender } = renderHook(
      ({ userId }: { userId: string | null }) => useCheckIn(userId),
      { initialProps: { userId: "user-123" as string | null } }
    );

    await waitFor(() => expect(result.current.streakDays).toBe(5));
    expect(result.current.isReset).toBe(false);

    // Null then non-null re-triggers the effect (new session, streak broken)
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 1, streak_days: 1, promoted: false, new_belt: 1 }],
      error: null,
    });

    act(() => {
      rerender({ userId: null });
    });
    act(() => {
      rerender({ userId: "user-123" });
    });

    await waitFor(() => expect(result.current.streakDays).toBe(1));
    expect(result.current.isReset).toBe(true);
  });

  // 3d — edge case: isReset false on first-ever check-in (no prior streak)
  it("sets isReset false when streak_days is 1 on first-ever check-in", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 1, streak_days: 1, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn("new-user"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isReset).toBe(false);
    expect(result.current.streakDays).toBe(1);
  });

  // 3e — edge case: xp_awarded = 0 (same-day call, idempotent no-op)
  it("returns lastXpAwarded === 0 when RPC returns same-day no-op", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 0, streak_days: 3, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn("user-123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastXpAwarded).toBe(0);
    expect(result.current.streakDays).toBe(3);
    expect(result.current.isLoading).toBe(false);
  });

  // 3f — edge case: promoted = true, new_belt = 2
  it("exposes promoted and newBelt when RPC returns a promotion", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 7, streak_days: 7, promoted: true, new_belt: 2 }],
      error: null,
    });

    const { result } = renderHook(() => useCheckIn("user-123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.promoted).toBe(true);
    expect(result.current.newBelt).toBe(2);
    expect(result.current.lastXpAwarded).toBe(7);
  });

  // 3g — edge case: RPC error → isLoading false, no throw
  it("sets isLoading false and does not throw when RPC returns an error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "network error", code: "500" },
    });

    const { result } = renderHook(() => useCheckIn("user-123"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.streakDays).toBe(0);
    expect(result.current.lastXpAwarded).toBe(0);
    expect(result.current.isReset).toBe(false);
    expect(result.current.tomorrowXp).toBeNull();
  });
});
