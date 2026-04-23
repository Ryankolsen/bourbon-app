/**
 * Unit tests for BeltBadge component.
 *
 * Pattern: render + @testing-library/react-native assertions.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { BeltBadge } from "@/components/BeltBadge";
import { BELTS } from "@/lib/belt-config";

describe("BeltBadge", () => {
  // 1 — core wiring: renders without throwing and has correct accessibilityLabel
  it("renders level 1 with accessibilityLabel 'White Dog belt'", () => {
    const { getByLabelText } = render(<BeltBadge level={1} />);
    expect(getByLabelText("White Dog belt")).toBeTruthy();
  });

  // 2 — content details: all 10 levels render with unique accessibilityLabels
  it("renders all 10 levels with unique accessibilityLabels matching belt names", () => {
    const labels = new Set<string>();

    BELTS.forEach((belt) => {
      const { getByLabelText } = render(<BeltBadge level={belt.level} />);
      const expectedLabel = `${belt.name} belt`;
      expect(getByLabelText(expectedLabel)).toBeTruthy();
      labels.add(expectedLabel);
    });

    // All 10 labels must be unique
    expect(labels.size).toBe(10);
  });

  it("level 10 has accessibilityLabel 'Pappy belt'", () => {
    const { getByLabelText } = render(<BeltBadge level={10} />);
    expect(getByLabelText("Pappy belt")).toBeTruthy();
  });

  // 3a — edge case: level 0 falls back to level 1 without throwing
  it("renders level-1 fallback for level 0 without throwing", () => {
    const { getByLabelText } = render(<BeltBadge level={0} />);
    expect(getByLabelText("White Dog belt")).toBeTruthy();
  });

  // 3b — edge case: level 11 falls back to level 1 without throwing
  it("renders level-1 fallback for level 11 without throwing", () => {
    const { getByLabelText } = render(<BeltBadge level={11} />);
    expect(getByLabelText("White Dog belt")).toBeTruthy();
  });

  // 3c — edge case: level 7 (Senpai tier) renders without error
  it("renders level 7 (Barrel Proof / Senpai tier) without error", () => {
    const { getByLabelText } = render(<BeltBadge level={7} />);
    expect(getByLabelText("Barrel Proof belt")).toBeTruthy();
  });
});
