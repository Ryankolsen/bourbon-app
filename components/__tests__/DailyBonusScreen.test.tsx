/**
 * Unit tests for DailyBonusScreen component.
 *
 * Pattern: mock useXpNotification to inject controlled dailyBonus state,
 * assert rendered output and dismiss callback. Follows XpToast.test.tsx style.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

// ── Mock XpContext ────────────────────────────────────────────────────────────

const mockClaimDailyBonus = jest.fn();
let mockDailyBonus: { shouldShow: boolean; awardedPoints: number; streakDays?: number } | null = null;

jest.mock("@/context/xp-context", () => ({
  useXpNotification: () => ({
    dailyBonus: mockDailyBonus,
    claimDailyBonus: mockClaimDailyBonus,
  }),
}));

import { DailyBonusScreen } from "../DailyBonusScreen";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DailyBonusScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDailyBonus = null;
  });

  // 1 — core wiring: renders amount and Barrel Points text
  it("renders awarded points and 'Barrel Points' when shouldShow is true", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 5 };
    const { getByText } = render(<DailyBonusScreen />);
    expect(getByText("+5 Barrel Points")).toBeTruthy();
  });

  // 2 — content details: Claim button calls claimDailyBonus
  it("calls claimDailyBonus when Claim button is pressed", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 5 };
    const { getByTestId } = render(<DailyBonusScreen />);
    fireEvent.press(getByTestId("claim-btn"));
    expect(mockClaimDailyBonus).toHaveBeenCalledTimes(1);
  });

  // 3 — edge case: renders nothing when shouldShow is false
  it("renders nothing when shouldShow is false", () => {
    mockDailyBonus = { shouldShow: false, awardedPoints: 0 };
    const { queryByText } = render(<DailyBonusScreen />);
    expect(queryByText(/Barrel Points/)).toBeNull();
  });

  // 4 — edge case: renders nothing when dailyBonus is null
  it("renders nothing when dailyBonus is null", () => {
    mockDailyBonus = null;
    const { queryByText } = render(<DailyBonusScreen />);
    expect(queryByText(/Barrel Points/)).toBeNull();
  });
});
