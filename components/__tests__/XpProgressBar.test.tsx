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
import { BELTS } from "@/lib/belt-config";
import { THEMES } from "@/lib/themes";
import { contrastRatio } from "@/lib/contrast";
import fs from "fs";
import path from "path";

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

  describe("theming and contrast", () => {
    it("uses theme tokens (no hard-coded hex colors) in the component source", () => {
      const src = fs.readFileSync(
        path.join(__dirname, "..", "XpProgressBar.tsx"),
        "utf8"
      );
      expect(src).not.toMatch(/#374151/i);
      expect(src).not.toMatch(/#F59E0B/i);
      expect(src).not.toMatch(/#9CA3AF/i);
    });

    it("track, fill border and labels use theme token classes", () => {
      const { getByTestId, rerender } = render(
        <XpProgressBar totalXp={5750} currentBelt={5} />
      );
      expect(getByTestId("xp-progress-track").props.className).toContain("bg-xp-track");
      expect(getByTestId("xp-progress-fill").props.className).toContain("border-brand-100");
      expect(getByTestId("xp-progress-label").props.className).toContain("text-brand-400");
      rerender(<XpProgressBar totalXp={90000} currentBelt={10} />);
      expect(getByTestId("xp-max-label").props.className).toContain("text-accent-amber");
    });

    it("does not draw a fill border at 0% progress", () => {
      const { getByTestId } = render(<XpProgressBar totalXp={0} currentBelt={1} />);
      expect(getByTestId("xp-progress-fill").props.className).toBeUndefined();
    });

    describe.each(THEMES.map((t) => [t.id, t] as const))("theme %s", (_id, theme) => {
      const c = theme.colors;
      it("fill border is >= 3:1 against the track (delineates every belt color)", () => {
        expect(contrastRatio(c.brand100, c.xpTrack)).toBeGreaterThanOrEqual(3);
      });
      it("every belt fill is distinguishable: fill-vs-track >= 3:1 or border delineates", () => {
        for (const belt of BELTS) {
          const fillOk = contrastRatio(belt.bgColor, c.xpTrack) >= 3;
          const borderOk = contrastRatio(c.brand100, c.xpTrack) >= 3;
          expect(fillOk || borderOk).toBe(true);
        }
      });
      it("12px labels are >= 4.5:1 on the card (brand-800)", () => {
        expect(contrastRatio(c.brand400, c.brand800)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(c.accentAmber, c.brand800)).toBeGreaterThanOrEqual(4.5);
      });
    });
  });
});
