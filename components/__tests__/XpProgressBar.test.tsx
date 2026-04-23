/**
 * Unit tests for XpProgressBar component.
 *
 * Pattern: render + @testing-library/react-native assertions.
 *
 * Belt thresholds referenced:
 *   Level 1 White Dog    minXp=0
 *   Level 5 Single Barrel minXp=3500
 *   Level 6 Small Batch   minXp=8000
 *   Level 10 Pappy        minXp=80000  (MAX)
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { XpProgressBar } from "@/components/XpProgressBar";

describe("XpProgressBar", () => {
  // 1 — core wiring: renders current and next XP threshold text
  it("renders '3,500' and '8,000' for totalXp=3500, currentBelt=5 (Single Barrel → Small Batch)", () => {
    const { getByText } = render(
      <XpProgressBar totalXp={3500} currentBelt={5} />
    );
    // The label text is "3,500 / 8,000 Barrel Points"
    expect(getByText(/3,500/)).toBeTruthy();
    expect(getByText(/8,000/)).toBeTruthy();
  });

  // 2 — content details: progress fill reflects 50% for totalXp=5750, currentBelt=5
  // (5750 - 3500) / (8000 - 3500) = 2250 / 4500 = 50%
  it("progress fill width is '50%' for totalXp=5750, currentBelt=5", () => {
    const { getByTestId } = render(
      <XpProgressBar totalXp={5750} currentBelt={5} />
    );
    const fill = getByTestId("xp-progress-fill");
    expect(fill.props.style.width).toBe("50%");
  });

  // 3a — edge case: belt 10 (MAX) shows MAX text, no numeric next-threshold
  it("renders MAX label for currentBelt=10 and does not show a numeric next-threshold", () => {
    const { getByTestId, queryByTestId } = render(
      <XpProgressBar totalXp={90000} currentBelt={10} />
    );
    expect(getByTestId("xp-max-label")).toBeTruthy();
    expect(queryByTestId("xp-progress-label")).toBeNull();
  });

  it("MAX label text contains 'MAX'", () => {
    const { getByText } = render(
      <XpProgressBar totalXp={90000} currentBelt={10} />
    );
    expect(getByText(/MAX/)).toBeTruthy();
  });

  // 3b — edge case: totalXp=0, currentBelt=1 → "0" and "200"
  it("renders '0' and '200' for totalXp=0, currentBelt=1 (White Dog → Corn Whiskey)", () => {
    const { getByTestId } = render(
      <XpProgressBar totalXp={0} currentBelt={1} />
    );
    const label = getByTestId("xp-progress-label");
    expect(label.props.children).toContain("0");
    expect(label.props.children).toContain("200");
  });

  // 3c — loading state: renders placeholder without crashing
  it("renders a loading skeleton without crashing when isLoading is true", () => {
    const { getByTestId } = render(
      <XpProgressBar totalXp={0} currentBelt={1} isLoading />
    );
    expect(getByTestId("xp-progress-loading")).toBeTruthy();
  });

  // 3d — fill width is 0% when totalXp equals the current belt's minXp
  it("progress fill width is '0%' when totalXp equals the current belt minXp (no progress yet)", () => {
    const { getByTestId } = render(
      <XpProgressBar totalXp={3500} currentBelt={5} />
    );
    const fill = getByTestId("xp-progress-fill");
    expect(fill.props.style.width).toBe("0%");
  });
});
