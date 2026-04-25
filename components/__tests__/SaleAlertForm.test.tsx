/**
 * Unit tests for SaleAlertForm component.
 *
 * Slices:
 *   1 — Core wiring: renders when visible=true, hides when visible=false
 *   2 — Bourbon search: typing shows results, tapping selects a bourbon
 *   3 — Submit disabled until bourbon + store + price filled
 *   4 — Submit calls createAlert mutation with correct args (manual store mode)
 *   5 — Toast shown on success, modal closes
 *   6 — Manual store inputs rendered when no Places API key
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    activeTheme: {
      colors: {
        placeholderGroup: "#666",
      },
    },
  }),
}));

jest.mock("@/lib/colors", () => ({
  colors: { spinnerDefault: "#fff", white: "#fff" },
}));

const mockShowToast = jest.fn();
jest.mock("@/lib/toast-provider", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockCreateMutate = jest.fn();
jest.mock("@/hooks/use-sale-alerts", () => ({
  useCreateSaleAlert: () => ({ mutate: mockCreateMutate, isPending: false }),
}));

const mockBourbonResults = [
  { id: "bourbon-1", name: "Blanton's Original", distillery: "Buffalo Trace" },
  { id: "bourbon-2", name: "Blanton's Gold", distillery: "Buffalo Trace" },
];

jest.mock("@/hooks/use-bourbons", () => ({
  useSearchSimilarBourbons: () => ({
    data: mockBourbonResults,
    isFetching: false,
  }),
}));

// No Places API key by default in tests
jest.mock("@/lib/places", () => ({
  hasPlacesApiKey: () => false,
  searchPlaces: jest.fn().mockResolvedValue([]),
  PLACES_API_KEY: "",
}));

import { SaleAlertForm } from "@/components/SaleAlertForm";

const DEFAULT_PROPS = {
  groupId: "group-abc",
  userId: "user-xyz",
  visible: true,
  onClose: jest.fn(),
};

function renderForm(overrides = {}) {
  return render(<SaleAlertForm {...DEFAULT_PROPS} {...overrides} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Slice 1: core wiring ──────────────────────────────────────────────────────

test("renders header and form fields when visible=true", () => {
  const { getByText, getByTestId } = renderForm();
  expect(getByText("Add Sale Alert")).toBeTruthy();
  expect(getByTestId("bourbon-search-input")).toBeTruthy();
  expect(getByTestId("price-input")).toBeTruthy();
  expect(getByTestId("note-input")).toBeTruthy();
  expect(getByTestId("submit-sale-alert")).toBeTruthy();
});

test("does not render form when visible=false", () => {
  const { queryByTestId } = renderForm({ visible: false });
  expect(queryByTestId("bourbon-search-input")).toBeNull();
});

// ── Slice 2: bourbon search ───────────────────────────────────────────────────

test("shows bourbon results list when query length >= 3", () => {
  const { getByTestId, queryByTestId } = renderForm();
  expect(queryByTestId("bourbon-results-list")).toBeNull();
  fireEvent.changeText(getByTestId("bourbon-search-input"), "Bla");
  expect(getByTestId("bourbon-results-list")).toBeTruthy();
  expect(getByTestId("bourbon-result-bourbon-1")).toBeTruthy();
});

test("selecting a bourbon hides results and shows confirmation chip", () => {
  const { getByTestId, queryByTestId, getByText } = renderForm();
  fireEvent.changeText(getByTestId("bourbon-search-input"), "Bla");
  fireEvent.press(getByTestId("bourbon-result-bourbon-1"));
  expect(queryByTestId("bourbon-results-list")).toBeNull();
  expect(getByText("Blanton's Original")).toBeTruthy();
});

// ── Slice 3: submit disabled unless all required fields filled ─────────────────

test("submit button is disabled when bourbon not selected", () => {
  const { getByTestId } = renderForm();
  // Price + store filled but no bourbon
  fireEvent.changeText(getByTestId("manual-store-name-input"), "Total Wine");
  fireEvent.changeText(getByTestId("manual-store-address-input"), "Louisville, KY");
  fireEvent.changeText(getByTestId("price-input"), "49.99");
  fireEvent.press(getByTestId("submit-sale-alert"));
  expect(mockCreateMutate).not.toHaveBeenCalled();
});

// ── Slice 4: submit calls mutation with correct args ──────────────────────────

test("submit calls createAlert mutation with correct payload", async () => {
  const { getByTestId } = renderForm();

  // Select bourbon
  fireEvent.changeText(getByTestId("bourbon-search-input"), "Bla");
  fireEvent.press(getByTestId("bourbon-result-bourbon-1"));

  // Fill manual store fields
  fireEvent.changeText(getByTestId("manual-store-name-input"), "Total Wine");
  fireEvent.changeText(getByTestId("manual-store-address-input"), "Louisville, KY 40299");

  // Fill price and note
  fireEvent.changeText(getByTestId("price-input"), "49.99");
  fireEvent.changeText(getByTestId("note-input"), "Limit 1 per customer");

  fireEvent.press(getByTestId("submit-sale-alert"));

  expect(mockCreateMutate).toHaveBeenCalledWith(
    expect.objectContaining({
      groupId: "group-abc",
      userId: "user-xyz",
      bourbonId: "bourbon-1",
      price: "$49.99",
      placeName: "Total Wine",
      placeAddress: "Louisville, KY 40299",
      note: "Limit 1 per customer",
    }),
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
  );
});

// ── Slice 5: success toast + close ────────────────────────────────────────────

test("calls showToast and onClose after successful submit", async () => {
  const onClose = jest.fn();
  // Make mutate call its onSuccess immediately
  mockCreateMutate.mockImplementation((_vars: unknown, { onSuccess }: { onSuccess: () => void }) => {
    onSuccess();
  });

  const { getByTestId } = renderForm({ onClose });

  fireEvent.changeText(getByTestId("bourbon-search-input"), "Bla");
  fireEvent.press(getByTestId("bourbon-result-bourbon-1"));
  fireEvent.changeText(getByTestId("manual-store-name-input"), "Total Wine");
  fireEvent.changeText(getByTestId("manual-store-address-input"), "Louisville, KY");
  fireEvent.changeText(getByTestId("price-input"), "49.99");
  fireEvent.press(getByTestId("submit-sale-alert"));

  await waitFor(() => {
    expect(mockShowToast).toHaveBeenCalledWith("Sale alert posted!", "success");
    expect(onClose).toHaveBeenCalled();
  });
});

// ── Slice 6: manual store mode when no Places API key ─────────────────────────

test("renders manual store name + address inputs when no Places API key", () => {
  const { getByTestId, queryByTestId } = renderForm();
  expect(getByTestId("manual-store-name-input")).toBeTruthy();
  expect(getByTestId("manual-store-address-input")).toBeTruthy();
  expect(queryByTestId("store-search-input")).toBeNull();
});
