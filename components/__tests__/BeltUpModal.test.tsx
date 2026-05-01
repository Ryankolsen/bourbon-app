/**
 * Unit tests for BeltUpModal component.
 *
 * Pattern: inject a controlled XpContext via jest.mock so tests can set
 * `current` to arbitrary promotion notifications and verify modal content
 * and dismissal behavior.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

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

// ── Mock XpContext ────────────────────────────────────────────────────────────

const mockAdvance = jest.fn();
type MockNotification = {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
};
let mockCurrent: MockNotification | null = null;

jest.mock("@/context/xp-context", () => ({
  useXpNotification: () => ({
    current: mockCurrent,
    advance: mockAdvance,
  }),
}));

import { BeltUpModal } from "../BeltUpModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePromotion(newBelt: number, id = "promo-1"): MockNotification {
  return {
    id,
    xpAwarded: 25,
    eventType: "tasting_logged",
    label: "Tasting logged",
    promoted: true,
    newBelt,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("BeltUpModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrent = null;
  });

  // 1 — core wiring: promotion event new_belt=5 shows modal with belt name
  it("renders and shows 'Single Barrel' when promoted to belt 5", () => {
    mockCurrent = makePromotion(5);
    const { getByTestId, getByText } = render(<BeltUpModal />);

    expect(getByTestId("belt-up-modal")).toBeTruthy();
    expect(getByText(/Single Barrel/)).toBeTruthy();
  });

  // 2a — content details: belt 7 contains 'Senpai'
  it("shows 'Senpai' in headline for new_belt=7", () => {
    mockCurrent = makePromotion(7);
    const { getByTestId } = render(<BeltUpModal />);
    const headline = getByTestId("belt-up-headline");
    expect(headline.props.children).toContain("Senpai");
  });

  // 2b — content details: belt 10 contains 'Sensei' and 'Legendary'
  it("shows 'Sensei' and 'Legendary' for new_belt=10", () => {
    mockCurrent = makePromotion(10);
    const { getByTestId } = render(<BeltUpModal />);

    const headline = getByTestId("belt-up-headline");
    expect(headline.props.children).toContain("Sensei");

    const copy = getByTestId("belt-up-copy");
    expect(copy.props.children).toContain("Legendary");
  });

  // 2c — content details: belt 1 shows neither 'Senpai' nor 'Sensei'
  it("shows neither Senpai nor Sensei for new_belt=1", () => {
    mockCurrent = makePromotion(1);
    const { getByTestId } = render(<BeltUpModal />);

    const headline = getByTestId("belt-up-headline").props.children;
    expect(JSON.stringify(headline)).not.toContain("Senpai");
    expect(JSON.stringify(headline)).not.toContain("Sensei");
  });

  // 3a — edge case: no promotion event → modal not rendered
  it("renders nothing when no notification is pending", () => {
    mockCurrent = null;
    const { queryByTestId } = render(<BeltUpModal />);
    expect(queryByTestId("belt-up-modal")).toBeNull();
  });

  // 3b — edge case: non-promotion notification → modal not rendered
  it("renders nothing when current notification is not a promotion", () => {
    mockCurrent = {
      id: "notif-1",
      xpAwarded: 25,
      eventType: "tasting_logged",
      label: "Tasting logged",
      promoted: false,
      newBelt: 1,
    };
    const { queryByTestId } = render(<BeltUpModal />);
    expect(queryByTestId("belt-up-modal")).toBeNull();
  });

  // 3c — dismissal: tapping CTA closes the modal
  it("dismisses when CTA button is tapped", () => {
    mockCurrent = makePromotion(5);
    const { getByTestId, queryByTestId } = render(<BeltUpModal />);

    expect(getByTestId("belt-up-modal")).toBeTruthy();
    fireEvent.press(getByTestId("belt-up-cta"));
    expect(queryByTestId("belt-up-modal")).toBeNull();
  });

  // 3d — re-show: a second promotion event after dismissal renders the modal again
  it("re-shows modal for a new promotion event after dismissal", () => {
    mockCurrent = makePromotion(5, "promo-a");
    const { getByTestId, queryByTestId, rerender } = render(<BeltUpModal />);

    // First promotion shown
    expect(getByTestId("belt-up-modal")).toBeTruthy();

    // Dismiss
    fireEvent.press(getByTestId("belt-up-cta"));
    expect(queryByTestId("belt-up-modal")).toBeNull();

    // New promotion event (different id)
    mockCurrent = makePromotion(6, "promo-b");
    rerender(<BeltUpModal />);

    expect(getByTestId("belt-up-modal")).toBeTruthy();
  });

  // 4a — share button: rendered in modal when promotion is active
  it("renders the Share Your Achievement button", () => {
    mockCurrent = makePromotion(5);
    const { getByTestId } = render(<BeltUpModal />);
    expect(getByTestId("belt-up-share")).toBeTruthy();
  });

  // 4b — share button: tapping opens AchievementShareSheet
  it("opens AchievementShareSheet when share button is tapped", () => {
    mockCurrent = makePromotion(5);
    const { getByTestId } = render(<BeltUpModal />);

    fireEvent.press(getByTestId("belt-up-share"));

    expect(getByTestId("mock-achievement-share-sheet")).toBeTruthy();
  });

  // 4c — share sheet: closing the sheet dismisses it but keeps BeltUpModal open
  it("closes AchievementShareSheet without dismissing BeltUpModal", () => {
    mockCurrent = makePromotion(5);
    const { getByTestId, queryByTestId } = render(<BeltUpModal />);

    fireEvent.press(getByTestId("belt-up-share"));
    expect(getByTestId("mock-achievement-share-sheet")).toBeTruthy();

    fireEvent.press(getByTestId("mock-share-sheet-close"));
    expect(queryByTestId("mock-achievement-share-sheet")).toBeNull();
    expect(getByTestId("belt-up-modal")).toBeTruthy();
  });
});
