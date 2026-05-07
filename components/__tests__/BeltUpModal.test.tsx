/**
 * Integration tests for BeltUpModal component.
 *
 * Pattern: wrap BeltUpModal in XpProvider with mocked Supabase and useAuth.
 * Realtime promotion events are simulated by capturing the channel callback.
 * This tests the latestPromotion signal path end-to-end.
 */

import React from "react";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";
import { XpProvider } from "@/context/xp-context";
import { BeltUpModal } from "../BeltUpModal";

// ── Mock AchievementShareSheet ────────────────────────────────────────────────

jest.mock("../AchievementShareSheet", () => ({
  AchievementShareSheet: ({
    visible,
    onClose,
  }: {
    visible: boolean;
    onClose: () => void;
  }) => {
    const { View, TouchableOpacity, Text } = require("react-native");
    if (!visible) return null;
    return (
      <View testID="mock-achievement-share-sheet">
        <TouchableOpacity testID="mock-share-sheet-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// ── Mock Supabase (capture Realtime callback) ─────────────────────────────────

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
// rpc returns xp_awarded: 0 so check_in doesn't inject a notification
const mockRpc = jest.fn().mockResolvedValue({
  data: [{ xp_awarded: 0, streak_days: 1, promoted: false, new_belt: 1 }],
  error: null,
});

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function firePromotion(newBelt: number, id: string) {
  capturedCallback?.({
    new: {
      id,
      xp_awarded: 10,
      event_type: "tasting_complete",
      promoted: true,
      new_belt: newBelt,
    },
  });
}

function renderModal() {
  return render(
    <XpProvider>
      <BeltUpModal />
    </XpProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("BeltUpModal", () => {
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
    mockRpc.mockResolvedValue({
      data: [{ xp_awarded: 0, streak_days: 1, promoted: false, new_belt: 1 }],
      error: null,
    });
  });

  // 1 — core wiring: promotion Realtime INSERT shows the modal
  it("shows modal when a promotion Realtime event fires", async () => {
    const { getByTestId } = renderModal();

    act(() => {
      firePromotion(2, "promo-1");
    });

    await waitFor(() => {
      expect(getByTestId("belt-up-modal")).toBeTruthy();
    });
  });

  // 2 — content details: belt name from getBeltConfig(3) appears in headline
  it("displays the correct belt name for new_belt=3", async () => {
    const { getByTestId } = renderModal();

    act(() => {
      firePromotion(3, "promo-oak");
    });

    await waitFor(() => {
      expect(getByTestId("belt-up-headline").props.children).toContain("New Oak");
    });
  });

  // 3a — edge case: tapping CTA dismisses the modal
  it("dismisses when CTA button is tapped", async () => {
    const { getByTestId, queryByTestId } = renderModal();

    act(() => {
      firePromotion(2, "promo-cta");
    });

    await waitFor(() => expect(getByTestId("belt-up-modal")).toBeTruthy());

    fireEvent.press(getByTestId("belt-up-cta"));

    await waitFor(() => {
      expect(queryByTestId("belt-up-modal")).toBeNull();
    });
  });

  // 3b — edge case: same promotion id does NOT re-open the modal
  it("does not re-show modal when the same promotion id fires again", async () => {
    const { getByTestId, queryByTestId } = renderModal();

    act(() => {
      firePromotion(2, "promo-dup");
    });

    await waitFor(() => expect(getByTestId("belt-up-modal")).toBeTruthy());

    fireEvent.press(getByTestId("belt-up-cta"));
    await waitFor(() => expect(queryByTestId("belt-up-modal")).toBeNull());

    // Same id fires again — modal should NOT reappear
    act(() => {
      firePromotion(2, "promo-dup");
    });

    await waitFor(() => {
      expect(queryByTestId("belt-up-modal")).toBeNull();
    });
  });

  // 3c — edge case: second promotion with different id re-shows modal
  it("re-shows modal for a new promotion id after dismissal", async () => {
    const { getByTestId, queryByTestId } = renderModal();

    act(() => {
      firePromotion(2, "promo-a");
    });

    await waitFor(() => expect(getByTestId("belt-up-modal")).toBeTruthy());

    fireEvent.press(getByTestId("belt-up-cta"));
    await waitFor(() => expect(queryByTestId("belt-up-modal")).toBeNull());

    act(() => {
      firePromotion(3, "promo-b");
    });

    await waitFor(() => {
      expect(getByTestId("belt-up-modal")).toBeTruthy();
      expect(getByTestId("belt-up-headline").props.children).toContain("New Oak");
    });
  });

  // 3d — edge case: no promotion events → modal not rendered
  it("renders nothing when no promotion event has fired", () => {
    const { queryByTestId } = renderModal();
    expect(queryByTestId("belt-up-modal")).toBeNull();
  });

  // 4a — share button: renders in modal
  it("renders the Share Your Achievement button", async () => {
    const { getByTestId } = renderModal();

    act(() => {
      firePromotion(5, "promo-share");
    });

    await waitFor(() => {
      expect(getByTestId("belt-up-share")).toBeTruthy();
    });
  });

  // 4b — share button: tapping opens AchievementShareSheet
  it("opens AchievementShareSheet when share button is tapped", async () => {
    const { getByTestId } = renderModal();

    act(() => {
      firePromotion(5, "promo-sheet");
    });

    await waitFor(() => expect(getByTestId("belt-up-modal")).toBeTruthy());

    fireEvent.press(getByTestId("belt-up-share"));

    expect(getByTestId("mock-achievement-share-sheet")).toBeTruthy();
  });

  // 4c — share sheet: closing sheet keeps BeltUpModal visible
  it("closes AchievementShareSheet without dismissing BeltUpModal", async () => {
    const { getByTestId, queryByTestId } = renderModal();

    act(() => {
      firePromotion(5, "promo-sheet-close");
    });

    await waitFor(() => expect(getByTestId("belt-up-modal")).toBeTruthy());

    fireEvent.press(getByTestId("belt-up-share"));
    expect(getByTestId("mock-achievement-share-sheet")).toBeTruthy();

    fireEvent.press(getByTestId("mock-share-sheet-close"));
    expect(queryByTestId("mock-achievement-share-sheet")).toBeNull();
    expect(getByTestId("belt-up-modal")).toBeTruthy();
  });
});
