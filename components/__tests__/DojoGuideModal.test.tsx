/**
 * Unit tests for DojoGuideModal component.
 *
 * Pattern: render with explicit props, query by testID and text.
 * No Supabase mock needed — component is pure/props-driven.
 */

import React from "react";
import { render, fireEvent, within } from "@testing-library/react-native";

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    activeTheme: {
      colors: {
        brand50: "#f0f9ff",
        brand100: "#e0f2fe",
        brand200: "#bae6fd",
        brand300: "#7dd3fc",
        brand400: "#38bdf8",
        brand500: "#0ea5e9",
        brand600: "#0284c7",
        brand700: "#374151",
        brand800: "#1f2937",
        brand900: "#111827",
        white: "#ffffff",
        black: "#000000",
      },
    },
  }),
}));

import { DojoGuideModal } from "../DojoGuideModal";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DojoGuideModal", () => {
  // 1 — Core wiring: all 10 belt names are rendered
  it("renders all 10 belt names including White Dog and Pappy", () => {
    const { getByText } = render(
      <DojoGuideModal visible totalXp={0} onClose={jest.fn()} />
    );

    expect(getByText("White Dog")).toBeTruthy();
    expect(getByText("Corn Whiskey")).toBeTruthy();
    expect(getByText("New Oak")).toBeTruthy();
    expect(getByText("Bonded")).toBeTruthy();
    expect(getByText("Single Barrel")).toBeTruthy();
    expect(getByText("Small Batch")).toBeTruthy();
    expect(getByText("Barrel Proof")).toBeTruthy();
    expect(getByText("Wheated")).toBeTruthy();
    expect(getByText("Single Malt")).toBeTruthy();
    expect(getByText("Pappy")).toBeTruthy();
  });

  // 2 — Current belt highlight: totalXp=1500 → belt 4 (Bonded) is highlighted
  it("marks only the current belt row with belt-row-current testID", () => {
    const { queryAllByTestId, getByTestId } = render(
      <DojoGuideModal visible totalXp={1500} onClose={jest.fn()} />
    );

    // Exactly one current row
    const currentRows = queryAllByTestId("belt-row-current");
    expect(currentRows).toHaveLength(1);

    // The highlighted row contains "Bonded"
    const currentRow = getByTestId("belt-row-current");
    expect(within(currentRow).getByText("Bonded")).toBeTruthy();
  });

  // 3 — Current XP shown: totalXp=1500 appears in the highlighted row
  it("shows current XP in the highlighted belt row", () => {
    const { getByTestId } = render(
      <DojoGuideModal visible totalXp={1500} onClose={jest.fn()} />
    );

    const xpDisplay = getByTestId("belt-row-current-xp");
    // children may be a string like "1500 XP" or "1,500 XP" depending on locale
    expect(String(xpDisplay.props.children)).toMatch(/1.?500/);
  });

  // 4 — Pappy edge case: belt 10 highlighted, no XP-to-next text
  it("highlights Pappy at max XP and shows no 'to next belt' text", () => {
    const { getByTestId, queryByText } = render(
      <DojoGuideModal visible totalXp={80000} onClose={jest.fn()} />
    );

    const currentRow = getByTestId("belt-row-current");
    expect(within(currentRow).getByText("Pappy")).toBeTruthy();

    expect(queryByText(/to next belt/i)).toBeNull();
  });

  // 5 — Close button calls onClose
  it("calls onClose when the close button is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DojoGuideModal visible totalXp={0} onClose={onClose} />
    );

    fireEvent.press(getByTestId("dojo-guide-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 6 — Tab switching: both tabs present, switching to How to Earn doesn't crash
  it("renders both tabs and switches to How to Earn without crashing", () => {
    const { getByText } = render(
      <DojoGuideModal visible totalXp={0} onClose={jest.fn()} />
    );

    expect(getByText("Belts")).toBeTruthy();
    expect(getByText("How to Earn")).toBeTruthy();

    // Switch tabs — should not throw
    fireEvent.press(getByText("How to Earn"));
  });

  // ── How to Earn tab tests ────────────────────────────────────────────────────

  // 7 — Core wiring: category headers "Tasting" and "Social" appear on the tab
  it("shows Tasting and Social category headers on the How to Earn tab", () => {
    const { getByText } = render(
      <DojoGuideModal visible totalXp={0} onClose={jest.fn()} />
    );

    fireEvent.press(getByText("How to Earn"));

    expect(getByText("Tasting")).toBeTruthy();
    expect(getByText("Social")).toBeTruthy();
  });

  // 8 — Content details: XP values are sourced from XP_AWARD_AMOUNTS
  it("shows correct action labels and XP values from XP_AWARD_AMOUNTS", () => {
    const { getByText } = render(
      <DojoGuideModal visible totalXp={0} onClose={jest.fn()} />
    );

    fireEvent.press(getByText("How to Earn"));

    expect(getByText("Log a tasting")).toBeTruthy();
    expect(getByText("+25 XP")).toBeTruthy();

    expect(getByText("Create a group")).toBeTruthy();
    expect(getByText("+50 XP")).toBeTruthy();
  });

  // 9 — Streak formula: day-N explanation text is present
  it("explains the streak day-N formula on the How to Earn tab", () => {
    const { getByText, getAllByText } = render(
      <DojoGuideModal visible totalXp={0} onClose={jest.fn()} />
    );

    fireEvent.press(getByText("How to Earn"));

    // Both the action label and the explanatory note reference "streak day"
    const matches = getAllByText(/streak day/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  // 10 — Streak milestones: 7-day (+20 XP) and 30-day (+75 XP) bonuses listed
  it("shows 7-day and 30-day streak milestone bonuses from STREAK_MILESTONE_BONUSES", () => {
    const { getByText, getByTestId } = render(
      <DojoGuideModal visible totalXp={0} onClose={jest.fn()} />
    );

    fireEvent.press(getByText("How to Earn"));

    const streaksSection = getByTestId("earn-category-streaks");

    expect(within(streaksSection).getByText(/7-day streak/i)).toBeTruthy();
    expect(within(streaksSection).getByText("+20 XP")).toBeTruthy();

    expect(within(streaksSection).getByText(/30-day streak/i)).toBeTruthy();
    expect(within(streaksSection).getByText("+75 XP")).toBeTruthy();
  });
});
