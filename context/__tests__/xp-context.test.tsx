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
        new: { xp_awarded: 25, event_type: "tasting_logged" },
      });
    });

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(25);
      expect(getByTestId("event-type").props.children).toBe("tasting_logged");
    });
  });

  // 2 — content details: eventType maps to human-readable label
  it("maps tasting_logged event_type to 'Tasting logged' label", async () => {
    const { getByTestId } = renderWithProvider();

    act(() => {
      capturedCallback?.({
        new: { xp_awarded: 25, event_type: "tasting_logged" },
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
      capturedCallback?.({ new: { xp_awarded: 10, event_type: "collection_add" } });
      capturedCallback?.({ new: { xp_awarded: 5, event_type: "wishlist_add" } });
    });

    // First notification shown
    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(10);
    });

    // Advance to second
    fireEvent.press(getByTestId("advance-btn"));

    await waitFor(() => {
      expect(getByTestId("xp-awarded").props.children).toBe(5);
      expect(getByTestId("event-type").props.children).toBe("wishlist_add");
    });
  });

  // 3b — edge case: provider unmount removes the Realtime subscription
  it("removes the Realtime channel on unmount", () => {
    const { unmount } = renderWithProvider();
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
