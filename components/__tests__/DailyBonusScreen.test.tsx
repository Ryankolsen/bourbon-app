/**
 * Unit tests for DailyBonusScreen component.
 *
 * Pattern: mock useXpNotification to inject controlled dailyBonus state,
 * assert rendered output and dismiss callback. Follows XpToast.test.tsx style.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

// ── Mock XpContext ────────────────────────────────────────────────────────────

import type { DailyBonusDecision } from "@/lib/daily-bonus";

const mockClaimDailyBonus = jest.fn();
let mockDailyBonus: Partial<DailyBonusDecision> | null = null;

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

  // 5 — milestone celebration renders on day 7
  it("renders milestone celebration text when milestoneHit is true", () => {
    mockDailyBonus = {
      shouldShow: true,
      awardedPoints: 27,
      streakDays: 7,
      milestoneHit: true,
      tomorrowPoints: 8,
      nextMilestone: { day: 30, daysRemaining: 23, bonusXp: 75 },
    };
    const { getByText } = render(<DailyBonusScreen />);
    expect(getByText(/7-Day Streak Milestone/i)).toBeTruthy();
  });

  // 6 — progress line and tomorrow value on normal day
  it("renders progress line and tomorrow value on a non-milestone day", () => {
    mockDailyBonus = {
      shouldShow: true,
      awardedPoints: 5,
      streakDays: 5,
      milestoneHit: false,
      tomorrowPoints: 6,
      nextMilestone: { day: 7, daysRemaining: 2, bonusXp: 20 },
    };
    const { getByText } = render(<DailyBonusScreen />);
    expect(getByText(/Day 5 of 7/i)).toBeTruthy();
    expect(getByText(/\+6 tomorrow/i)).toBeTruthy();
  });
});
