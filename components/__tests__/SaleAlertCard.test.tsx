/**
 * Unit tests for SaleAlertCard component.
 *
 * Slices:
 *   1 — Core wiring: renders bourbon name + sale alert badge
 *   2 — Content details: price, store name/address, poster label
 *   3 — Optional note shown/hidden
 *   4 — Action buttons: Directions + Remove; Remove opens confirmation
 *   5 — No Remove button when currentUserId is undefined
 */

import React from "react";
import { Linking } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    activeTheme: {
      colors: {
        brand800: "#1a1a1a",
        brand700: "#0369a1",
        accentAmber: "#f59e0b",
        surfaceText: "#bae6fd",
      },
    },
  }),
}));

const mockRemoveMutate = jest.fn();
jest.mock("@/hooks/use-sale-alerts", () => ({
  useRemoveSaleAlert: () => ({ mutate: mockRemoveMutate, isPending: false }),
}));

jest.mock("@/components/ConfirmationModal", () => ({
  ConfirmationModal: ({ visible, onConfirm, onCancel }: { visible: boolean; onConfirm: () => void; onCancel: () => void }) => {
    if (!visible) return null;
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <>
        <TouchableOpacity testID="modal-confirm" onPress={onConfirm}>
          <Text>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="modal-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </>
    );
  },
}));

import { SaleAlertCard } from "@/components/SaleAlertCard";
import type { SaleAlert } from "@/hooks/use-sale-alerts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAlert(overrides: Partial<SaleAlert> = {}): SaleAlert {
  return {
    id: "alert-1",
    group_id: "group-1",
    bourbon_id: "bourbon-1",
    posted_by: "user-1",
    price: "$28",
    place_id: "ChIJabcd",
    place_name: "Total Wine & More",
    place_address: "123 Main St, Louisville, KY",
    note: null,
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(), // 5 min ago
    removed_at: null,
    removed_by: null,
    bourbon_name: "Buffalo Trace",
    bourbon_distillery: "Buffalo Trace Distillery",
    poster_display_name: "Jane Doe",
    poster_username: "janedoe",
    poster_avatar_url: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SaleAlertCard", () => {
  beforeEach(() => {
    mockRemoveMutate.mockClear();
  });

  // Slice 1 — Core wiring
  it("renders the bourbon name and sale alert badge", () => {
    const { getByTestId } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="current-user" />
    );
    expect(getByTestId("sale-alert-card")).toBeTruthy();
    expect(getByTestId("sale-alert-badge")).toBeTruthy();
    expect(getByTestId("sale-alert-bourbon-name").props.children).toBe("Buffalo Trace");
  });

  // Slice 2 — Content details
  it("shows price, store name, address, and poster", () => {
    const { getByTestId, getByText } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="current-user" />
    );
    expect(getByTestId("sale-alert-price").props.children).toBe("$28");
    expect(getByTestId("sale-alert-place-name").props.children).toBe("Total Wine & More");
    expect(getByTestId("sale-alert-place-address").props.children).toBe("123 Main St, Louisville, KY");
    expect(getByText(/Jane Doe/)).toBeTruthy();
  });

  // Slice 3a — Note shown when present
  it("renders note when alert has a note", () => {
    const { getByTestId } = render(
      <SaleAlertCard
        alert={makeAlert({ note: "only 3 bottles left" })}
        currentUserId="current-user"
      />
    );
    expect(getByTestId("sale-alert-note")).toBeTruthy();
  });

  // Slice 3b — Note hidden when null
  it("does not render note element when note is null", () => {
    const { queryByTestId } = render(
      <SaleAlertCard alert={makeAlert({ note: null })} currentUserId="current-user" />
    );
    expect(queryByTestId("sale-alert-note")).toBeNull();
  });

  // Slice 4a — Directions button present
  it("renders Directions button", () => {
    const { getByTestId } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="current-user" />
    );
    expect(getByTestId("sale-alert-directions")).toBeTruthy();
  });

  // Slice 4b — Remove button opens confirmation, confirm triggers mutation
  it("pressing Remove opens confirmation; confirming calls removeMutation", () => {
    const { getByTestId } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="current-user" />
    );
    fireEvent.press(getByTestId("sale-alert-remove"));
    // confirmation modal is now visible
    const confirmBtn = getByTestId("modal-confirm");
    fireEvent.press(confirmBtn);
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      alertId: "alert-1",
      groupId: "group-1",
      userId: "current-user",
    });
  });

  // Slice 5 — No Remove button when not logged in
  it("does not render Remove button when currentUserId is undefined", () => {
    const { queryByTestId } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId={undefined} />
    );
    expect(queryByTestId("sale-alert-remove")).toBeNull();
  });

  it("leaves the outer card inaccessible so the action buttons stay focusable", () => {
    const { getByTestId } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="user-1" />
    );
    expect(getByTestId("sale-alert-card").props.accessible).toBe(false);
  });

  it("names the open target with the bourbon, price, store and note", () => {
    const { getByRole } = render(
      <SaleAlertCard alert={makeAlert({ note: "only 3 left" })} currentUserId="user-1" />
    );
    expect(
      getByRole("button", {
        name: "Sale alert for Buffalo Trace, Buffalo Trace Distillery, $28 at Total Wine & More, 123 Main St, Louisville, KY, only 3 left",
      })
    ).toBeTruthy();
  });

  it("opens the bourbon from the open target", () => {
    mockPush.mockClear();
    const { getByRole } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="user-1" />
    );
    fireEvent.press(
      getByRole("button", {
        name: /^Sale alert for Buffalo Trace/,
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/bourbon/bourbon-1");
  });

  it("Get directions is its own button and opens maps without opening the bourbon", () => {
    mockPush.mockClear();
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { getByRole } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="user-1" />
    );
    fireEvent.press(getByRole("button", { name: "Get directions" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("Remove sale alert is its own button and opens the confirmation", () => {
    const { getByRole, getByTestId } = render(
      <SaleAlertCard alert={makeAlert()} currentUserId="user-1" />
    );
    fireEvent.press(getByRole("button", { name: "Remove sale alert" }));
    expect(getByTestId("modal-confirm")).toBeTruthy();
  });
});
