/**
 * Unit tests for XpContext / XpProvider / useXpNotification.
 *
 * Pattern: render a consumer component inside XpProvider with mocked supabase
 * and useAuth. Realtime events are simulated by capturing the channel callback
 * and calling it directly. RPC calls are resolved via mockRpc.
 */

import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";
import { XpProvider, useXpNotification } from "../xp-context";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Capture the postgres_changes callback so tests can trigger fake Realtime events
let capturedCallback: ((payload: unknown) => void) | null = null;
const mockRemoveChannel = jest.fn();
const mockSubscribe = jest.fn().mockReturnThis();
const mockOn = jest.fn().mockImplementation(
  (_event: unknown, _filter: unknown, cb: (payload: unknown) => void) => {
    capturedCallback = cb;
    return { subscribe: mockSubscribe };
  }
);
const mockChannelObj = { on: mockOn, subscribe: mockSubscribe };
const mockChannel = jest.fn().mockReturnValue(mockChannelObj);
const mockRpc = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("@/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Mutable so individual tests can change auth state
let mockAuthUser: { id: string } | null = { id: "user-123" };

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

// ── Consumer helpers ──────────────────────────────────────────────────────────

/** Renders current notification fields + an advance button for queue testing. */
function Consumer() {
  const { current, advance, dailyBonus } = useXpNotification();
  return (
    <>
      {current ? (
        <>
          <Text testID="xp-awarded">{current.xpAwarded}</Text>
          <Text testID="event-type">{current.eventType}</Text>
          <Text testID="label">{current.label}</Text>
          <TouchableOpacity testID="advance-btn" onPress={advance}>
            <Text>advance</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text testID="no-notif">none</Text>
      )}
      {dailyBonus?.shouldShow && (
        <>
          <Text testID="daily-bonus-points">{dailyBonus.awardedPoints}</Text>
          <Text testID="daily-bonus-streak">{dailyBonus.streakDays}</Text>
        </>
      )}
    </>
  );
}

function renderWithProvider() {
  return render(
    <XpProvider>
      <Consumer />
    </XpProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("XpContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = null;
    mockAuthUser = { id: "user-123" };
    mockOn.mockImplementation(
      (_event: unknown, _filter: unknown, cb: (payload: unknown) => void) => {
        capturedCallback = cb;
        return { subscribe: mockSubscribe };
      }
    );
    mockChannel.mockReturnValue(mockChannelObj);
    // Default RPC return: non-zero XP, streak day 3, no promotion
    mockRpc.mockResolvedValue({
      data: [{ xp_awarded: 4, streak_days: 3, promoted: false, new_belt: 1 }],
      error: null,
    });
  });

  // 1 — core wiring: Realtime INSERT dispatches a pending notification
  it("dispatches a notification when a Realtime INSERT fires", async () => {
    const { getByTestId } = renderWithProvider();

    // Wait for RPC to resolve — daily_checkin goes to dailyBonus, not current
    await waitFor(() => expect(getByTestId("daily-bonus-points")).toBeTruthy());
    // current is still empty (no toast for daily_checkin)
    expect(getByTestId("no-notif")).toBeTruthy();

    act(() => {
      capturedCallback?.({
        new: { xp_awarded: 25, event_type: "tasting_complete" },
      });
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(25);
      expect(getByTestId("event-type").props.children).toBe("tasting_complete");
    });
  });

  // 2 — content details: eventType maps to human-readable label
  it("maps tasting_complete event_type to 'Tasting logged' label", async () => {
    const { getByTestId } = renderWithProvider();

    await waitFor(() => expect(getByTestId("daily-bonus-points")).toBeTruthy());

    act(() => {
      capturedCallback?.({
        new: { xp_awarded: 25, event_type: "tasting_complete" },
      });
    });

    await waitFor(() => {
      expect(getByTestId("label").props.children).toBe("Tasting logged");
    });
  });

  // 3a — edge case: two rapid events queue up; first is shown, second pending
  it("shows first notification and reveals second after advance", async () => {
    const { getByTestId } = renderWithProvider();

    // Wait for RPC to settle
    await waitFor(() => expect(getByTestId("daily-bonus-points")).toBeTruthy());

    act(() => {
      capturedCallback?.({ new: { xp_awarded: 10, event_type: "bourbon_added_to_collection" } });
      capturedCallback?.({ new: { xp_awarded: 5, event_type: "bourbon_added_to_wishlist" } });
    });

    // First notification shown
    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(10);
    });

    // Advance to second
    fireEvent.press(getByTestId("advance-btn"));

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(5);
      expect(getByTestId("event-type").props.children).toBe("bourbon_added_to_wishlist");
    });
  });

  // 3b — edge case: provider unmount removes the Realtime subscription
  it("removes the Realtime channel on unmount", () => {
    const { unmount } = renderWithProvider();
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  // ── RPC check_in() tests ──────────────────────────────────────────────────

  // R1 — core wiring: check_in() sets dailyBonus, NOT the toast queue
  it("RPC: populates dailyBonus (not current) after check_in resolves with xp_awarded > 0", async () => {
    const { getByTestId, queryByTestId } = renderWithProvider();

    await waitFor(() => {
      expect(getByTestId("daily-bonus-points").props.children).toBe(4);
    });

    // Toast queue must remain empty for daily_checkin
    expect(queryByTestId("xp-awarded")).toBeNull();
    expect(getByTestId("no-notif")).toBeTruthy();

    expect(mockRpc).toHaveBeenCalledWith("check_in");
  });

  // R2 — content details: streakDays is populated in dailyBonus
  it("RPC: populates streakDays in dailyBonus after check_in resolves", async () => {
    const { getByTestId } = renderWithProvider();

    await waitFor(() => {
      expect(getByTestId("daily-bonus-streak").props.children).toBe(3);
    });
  });

  // R2b — new spec test: non-daily_checkin Realtime INSERT still enqueues to toast
  it("RPC: toast queue receives non-daily_checkin Realtime events after check_in", async () => {
    const { getByTestId } = renderWithProvider();

    // Wait for check_in to complete
    await waitFor(() => expect(getByTestId("daily-bonus-points")).toBeTruthy());

    // current is empty (daily_checkin didn't go to toast)
    expect(getByTestId("no-notif")).toBeTruthy();

    act(() => {
      capturedCallback?.({
        new: { xp_awarded: 25, event_type: "tasting_complete" },
      });
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(25);
      expect(getByTestId("event-type").props.children).toBe("tasting_complete");
    });
  });

  // R3a — edge case: promoted: true sets latestPromotion
  it("RPC: sets latestPromotion when check_in returns promoted: true", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 7, streak_days: 7, promoted: true, new_belt: 3 }],
      error: null,
    });

    function PromotionConsumer() {
      const { latestPromotion } = useXpNotification();
      if (!latestPromotion) return <Text testID="no-promo">none</Text>;
      return <Text testID="promo-belt">{latestPromotion.belt}</Text>;
    }

    const { getByTestId } = render(
      <XpProvider>
        <PromotionConsumer />
      </XpProvider>
    );

    await waitFor(() => {
      expect(getByTestId("promo-belt").props.children).toBe(3);
    });
  });

  // R3b — edge case: Realtime daily_checkin event is skipped (not enqueued)
  it("RPC: Realtime daily_checkin event is ignored (not added to toast queue)", async () => {
    const { getByTestId } = renderWithProvider();

    // Wait for check_in RPC to settle
    await waitFor(() => expect(getByTestId("daily-bonus-points")).toBeTruthy());

    // Simulate a Realtime daily_checkin INSERT
    act(() => {
      capturedCallback?.({
        new: {
          id: "daily_checkin-row-id",
          xp_awarded: 4,
          event_type: "daily_checkin",
        },
      });
    });

    // current remains empty — daily_checkin is skipped in Realtime path
    await waitFor(() => {
      expect(getByTestId("no-notif")).toBeTruthy();
    });
  });

  // R3c — edge case: userId null → RPC not called, Realtime not subscribed
  it("RPC: does not call rpc or subscribe when userId is null", () => {
    mockAuthUser = null;

    render(
      <XpProvider>
        <Consumer />
      </XpProvider>
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockChannel).not.toHaveBeenCalled();
  });

  // R3d — edge case: dailyBonus.streakDays reflects the day count from check_in
  it("RPC: dailyBonus.streakDays is 1 when check_in returns streak_days: 1", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 1, streak_days: 1, promoted: false, new_belt: 1 }],
      error: null,
    });

    const { getByTestId } = renderWithProvider();

    await waitFor(() => {
      expect(getByTestId("daily-bonus-streak").props.children).toBe(1);
    });
  });

  // ── latestPromotion tests ─────────────────────────────────────────────────

  // L1 — core wiring: promoted Realtime INSERT sets latestPromotion
  it("latestPromotion: sets belt and id when Realtime INSERT has promoted: true", async () => {
    function PromotionConsumer() {
      const { latestPromotion } = useXpNotification();
      if (!latestPromotion) return <Text testID="no-promo">none</Text>;
      return (
        <>
          <Text testID="promo-belt">{latestPromotion.belt}</Text>
          <Text testID="promo-id">{latestPromotion.id}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <XpProvider>
        <PromotionConsumer />
      </XpProvider>
    );

    // Wait for RPC to settle (no promotion in default mock)
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());

    act(() => {
      capturedCallback?.({
        new: {
          id: "promo-row-uuid",
          xp_awarded: 10,
          event_type: "tasting_complete",
          promoted: true,
          new_belt: 3,
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId("promo-belt").props.children).toBe(3);
      expect(getByTestId("promo-id").props.children).toBe("promo-row-uuid");
    });
  });

  // L2 — content details: correct belt and id from Realtime payload
  it("latestPromotion: captures exact belt and id from payload", async () => {
    function PromotionConsumer() {
      const { latestPromotion } = useXpNotification();
      if (!latestPromotion) return <Text testID="no-promo">none</Text>;
      return (
        <>
          <Text testID="promo-belt">{latestPromotion.belt}</Text>
          <Text testID="promo-id">{latestPromotion.id}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <XpProvider>
        <PromotionConsumer />
      </XpProvider>
    );

    await waitFor(() => expect(mockRpc).toHaveBeenCalled());

    act(() => {
      capturedCallback?.({
        new: {
          id: "promo-uuid-1",
          xp_awarded: 10,
          event_type: "tasting_complete",
          promoted: true,
          new_belt: 2,
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId("promo-belt").props.children).toBe(2);
      expect(getByTestId("promo-id").props.children).toBe("promo-uuid-1");
    });
  });

  // L3a — edge case: advance() does NOT clear latestPromotion
  it("latestPromotion: advance() does not clear latestPromotion", async () => {
    function PromotionAdvanceConsumer() {
      const { current, advance, latestPromotion } = useXpNotification();
      return (
        <>
          {latestPromotion ? (
            <Text testID="promo-belt">{latestPromotion.belt}</Text>
          ) : (
            <Text testID="no-promo">none</Text>
          )}
          {current ? (
            <TouchableOpacity testID="advance-btn" onPress={advance}>
              <Text>advance</Text>
            </TouchableOpacity>
          ) : null}
        </>
      );
    }

    const { getByTestId, queryByTestId } = render(
      <XpProvider>
        <PromotionAdvanceConsumer />
      </XpProvider>
    );

    // Wait for RPC to settle — no current notification (daily_checkin → dailyBonus)
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(queryByTestId("advance-btn")).toBeNull();

    act(() => {
      capturedCallback?.({
        new: {
          id: "promo-adv-1",
          xp_awarded: 10,
          event_type: "tasting_complete",
          promoted: true,
          new_belt: 4,
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId("promo-belt").props.children).toBe(4);
      expect(getByTestId("advance-btn")).toBeTruthy();
    });

    fireEvent.press(getByTestId("advance-btn"));

    await waitFor(() => {
      // latestPromotion still set after advancing the queue
      expect(getByTestId("promo-belt").props.children).toBe(4);
      expect(queryByTestId("advance-btn")).toBeNull();
    });
  });

  // L3b — edge case: second promotion with different id updates latestPromotion
  it("latestPromotion: updates to new belt/id when second promotion fires", async () => {
    function PromotionConsumer() {
      const { latestPromotion } = useXpNotification();
      if (!latestPromotion) return <Text testID="no-promo">none</Text>;
      return (
        <>
          <Text testID="promo-belt">{latestPromotion.belt}</Text>
          <Text testID="promo-id">{latestPromotion.id}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <XpProvider>
        <PromotionConsumer />
      </XpProvider>
    );

    await waitFor(() => expect(mockRpc).toHaveBeenCalled());

    act(() => {
      capturedCallback?.({
        new: { id: "promo-first", xp_awarded: 10, event_type: "tasting_complete", promoted: true, new_belt: 2 },
      });
    });

    await waitFor(() => {
      expect(getByTestId("promo-belt").props.children).toBe(2);
    });

    act(() => {
      capturedCallback?.({
        new: { id: "promo-second", xp_awarded: 10, event_type: "tasting_complete", promoted: true, new_belt: 3 },
      });
    });

    await waitFor(() => {
      expect(getByTestId("promo-belt").props.children).toBe(3);
      expect(getByTestId("promo-id").props.children).toBe("promo-second");
    });
  });

  // L3c — edge case: promoted: false does not set latestPromotion
  it("latestPromotion: remains null when Realtime INSERT has promoted: false", async () => {
    // Use a mock that returns xp_awarded: 0 so the RPC path doesn't set latestPromotion
    mockRpc.mockResolvedValueOnce({
      data: [{ xp_awarded: 0, streak_days: 1, promoted: false, new_belt: 1 }],
      error: null,
    });

    function PromotionConsumer() {
      const { latestPromotion } = useXpNotification();
      if (!latestPromotion) return <Text testID="no-promo">none</Text>;
      return <Text testID="promo-belt">{latestPromotion.belt}</Text>;
    }

    const { getByTestId } = render(
      <XpProvider>
        <PromotionConsumer />
      </XpProvider>
    );

    await waitFor(() => expect(mockRpc).toHaveBeenCalled());

    act(() => {
      capturedCallback?.({
        new: { id: "non-promo", xp_awarded: 10, event_type: "tasting_complete", promoted: false, new_belt: 1 },
      });
    });

    await waitFor(() => {
      expect(getByTestId("no-promo")).toBeTruthy();
    });
  });
});
