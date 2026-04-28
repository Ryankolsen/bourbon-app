/**
 * Unit tests for XpContext / XpProvider / useXpNotification.
 *
 * Pattern: render a consumer component inside XpProvider with mocked supabase
 * and useAuth. Realtime events are simulated by capturing the channel callback
 * and calling it directly.
 */

import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";
import { XpProvider, useXpNotification, XpNotification } from "../xp-context";

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

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

jest.mock("@/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const mockUserId = "user-123";

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

// ── Consumer helpers ──────────────────────────────────────────────────────────

/** Renders current notification text + an advance button for queue testing. */
function Consumer() {
  const { current, advance } = useXpNotification();
  if (!current) return <Text testID="no-notif">none</Text>;
  return (
    <>
      <Text testID="xp-awarded">{current.xpAwarded}</Text>
      <Text testID="event-type">{current.eventType}</Text>
      <Text testID="label">{current.label}</Text>
      {current.streakDays !== undefined && (
        <Text testID="streak-days">{current.streakDays}</Text>
      )}
      <TouchableOpacity testID="advance-btn" onPress={advance}>
        <Text>advance</Text>
      </TouchableOpacity>
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
    mockOn.mockImplementation(
      (_event: unknown, _filter: unknown, cb: (payload: unknown) => void) => {
        capturedCallback = cb;
        return { subscribe: mockSubscribe };
      }
    );
    mockChannel.mockReturnValue(mockChannelObj);
  });

  // 1 — core wiring: Realtime INSERT dispatches a pending notification
  it("dispatches a notification when a Realtime INSERT fires", async () => {
    const { getByTestId } = renderWithProvider();

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

  // ── enqueue() tests ───────────────────────────────────────────────────────

  // 4 — core wiring: calling enqueue() adds notification to queue
  it("enqueue: adds a notification to the queue when xpAwarded > 0", async () => {
    let capturedEnqueue: ((n: XpNotification) => void) | null = null;

    function CoreWiringConsumer() {
      const { current, enqueue } = useXpNotification();
      capturedEnqueue = enqueue;
      if (!current) return <Text testID="no-notif">none</Text>;
      return (
        <>
          <Text testID="xp-awarded">{current.xpAwarded}</Text>
          <Text testID="event-type">{current.eventType}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <XpProvider>
        <CoreWiringConsumer />
      </XpProvider>
    );

    expect(getByTestId("no-notif")).toBeTruthy();

    act(() => {
      capturedEnqueue?.({
        id: "direct-1",
        xpAwarded: 4,
        eventType: "daily_checkin",
        label: "Daily check-in",
        promoted: false,
        newBelt: 1,
      });
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(4);
      expect(getByTestId("event-type").props.children).toBe("daily_checkin");
    });
  });

  // 5 — content details: daily_checkin with streakDays is preserved
  it("enqueue: preserves streakDays on a daily_checkin notification", async () => {
    function StreakConsumer() {
      const { current, enqueue } = useXpNotification();
      if (!current)
        return (
          <TouchableOpacity
            testID="enqueue-streak-btn"
            onPress={() =>
              enqueue({
                id: "checkin-today",
                xpAwarded: 4,
                eventType: "daily_checkin",
                label: "Daily check-in",
                promoted: false,
                newBelt: 1,
                streakDays: 4,
              })
            }
          >
            <Text testID="no-notif">none</Text>
          </TouchableOpacity>
        );
      return (
        <>
          <Text testID="xp-awarded">{current.xpAwarded}</Text>
          <Text testID="streak-days">{current.streakDays}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <XpProvider>
        <StreakConsumer />
      </XpProvider>
    );

    act(() => {
      fireEvent.press(getByTestId("enqueue-streak-btn"));
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(4);
      expect(getByTestId("streak-days").props.children).toBe(4);
    });
  });

  // 6 — edge case: same id enqueued twice only appears once (deduplication)
  it("enqueue: deduplicates notifications with the same id", async () => {
    let capturedEnqueue: ((n: XpNotification) => void) | null = null;
    let queueLength = 0;

    function DedupConsumer() {
      const { current, advance, enqueue } = useXpNotification();
      capturedEnqueue = enqueue;
      queueLength = current ? 1 : 0;
      if (!current) return <Text testID="no-notif">none</Text>;
      return (
        <>
          <Text testID="xp-awarded">{current.xpAwarded}</Text>
          <TouchableOpacity testID="advance-btn" onPress={advance}>
            <Text>advance</Text>
          </TouchableOpacity>
        </>
      );
    }

    const { getByTestId, queryByTestId } = render(
      <XpProvider>
        <DedupConsumer />
      </XpProvider>
    );

    const notif: XpNotification = {
      id: "dedup-id",
      xpAwarded: 10,
      eventType: "daily_checkin",
      label: "Daily check-in",
      promoted: false,
      newBelt: 1,
    };

    act(() => {
      capturedEnqueue?.(notif);
      capturedEnqueue?.(notif); // same id — should be dropped
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(10);
    });

    // Advance should reveal "none" (queue has only 1 item)
    fireEvent.press(getByTestId("advance-btn"));
    await waitFor(() => {
      expect(getByTestId("no-notif")).toBeTruthy();
    });
  });

  // 7 — edge case: xpAwarded: 0 is ignored
  it("enqueue: ignores notifications with xpAwarded === 0", async () => {
    let capturedEnqueue: ((n: XpNotification) => void) | null = null;

    function ZeroConsumer() {
      const { current, enqueue } = useXpNotification();
      capturedEnqueue = enqueue;
      if (!current) return <Text testID="no-notif">none</Text>;
      return <Text testID="xp-awarded">{current.xpAwarded}</Text>;
    }

    const { getByTestId } = render(
      <XpProvider>
        <ZeroConsumer />
      </XpProvider>
    );

    act(() => {
      capturedEnqueue?.({
        id: "zero-xp",
        xpAwarded: 0,
        eventType: "daily_checkin",
        label: "Daily check-in",
        promoted: false,
        newBelt: 1,
      });
    });

    await waitFor(() => {
      expect(getByTestId("no-notif")).toBeTruthy();
    });
  });

  // 8 — edge case: Realtime INSERT with same id as direct enqueue is dropped
  it("Realtime duplicate of a directly-enqueued notification is dropped", async () => {
    let capturedEnqueue: ((n: XpNotification) => void) | null = null;

    function RealtimeDedupConsumer() {
      const { current, advance, enqueue } = useXpNotification();
      capturedEnqueue = enqueue;
      if (!current) return <Text testID="no-notif">none</Text>;
      return (
        <>
          <Text testID="xp-awarded">{current.xpAwarded}</Text>
          <TouchableOpacity testID="advance-btn" onPress={advance}>
            <Text>advance</Text>
          </TouchableOpacity>
        </>
      );
    }

    const { getByTestId } = render(
      <XpProvider>
        <RealtimeDedupConsumer />
      </XpProvider>
    );

    const sharedId = "shared-event-uuid";

    act(() => {
      // Direct enqueue first
      capturedEnqueue?.({
        id: sharedId,
        xpAwarded: 5,
        eventType: "daily_checkin",
        label: "Daily check-in",
        promoted: false,
        newBelt: 1,
      });
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(5);
    });

    act(() => {
      // Realtime arrives with the same row id — should be deduplicated
      capturedCallback?.({
        new: { id: sharedId, xp_awarded: 5, event_type: "daily_checkin" },
      });
    });

    // Advance: if Realtime was not deduplicated there would be a second item
    fireEvent.press(getByTestId("advance-btn"));
    await waitFor(() => {
      expect(getByTestId("no-notif")).toBeTruthy();
    });
  });
});
