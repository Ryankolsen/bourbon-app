/**
 * Unit tests for DailyBonusScreen component.
 *
 * Pattern: mock useXpNotification to inject controlled dailyBonus state,
 * assert rendered output and dismiss callback. Follows XpToast.test.tsx style.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";

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

// ── Mock ThemeProvider ────────────────────────────────────────────────────────

const mockDefaultColors = {
  brand800: "#1a1a1a",
  brand100: "#e0f2fe",
  brand400: "#38bdf8",
  brand500: "#0ea5e9",
  accentAmber: "#f59e0b",
  white: "#ffffff",
};

let mockThemeColors = { ...mockDefaultColors };

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    activeTheme: { colors: mockThemeColors },
    themeMode: "system",
    setThemeMode: jest.fn(),
    setDevThemeId: jest.fn(),
  }),
}));

import { DailyBonusScreen } from "../DailyBonusScreen";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DailyBonusScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDailyBonus = null;
    mockThemeColors = { ...mockDefaultColors };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // 1 — core wiring: renders amount and Barrel Points text on initial display
  it("renders awarded points and 'Barrel Points' when shouldShow is true", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 5 };
    const { getByText } = render(<DailyBonusScreen />);
    expect(getByText("+5 Barrel Points")).toBeTruthy();
  });

  // 2 — content details: Claim button triggers animation then calls claimDailyBonus
  it("calls claimDailyBonus after count-up animation completes on Claim press", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 5 };
    const { getByTestId } = render(<DailyBonusScreen />);
    fireEvent.press(getByTestId("claim-btn"));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
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

  // 7a — regression: Claim press must never render "+0 Barrel Points", even for one frame
  it("never flashes to 0 points immediately after Claim is pressed", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 5 };
    const { getByTestId, queryByText } = render(<DailyBonusScreen />);

    fireEvent.press(getByTestId("claim-btn"));

    // Check synchronously, before any timers have fired.
    expect(queryByText("+0 Barrel Points")).toBeNull();
  });

  // 7 — count-up animation settles on awardedPoints after Claim + timer advance
  it("count-up animation settles on awardedPoints after Claim press and timers flush", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 1 };
    const { getByTestId, getByText } = render(<DailyBonusScreen />);

    fireEvent.press(getByTestId("claim-btn"));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Modal stays visible in tests (claimDailyBonus is a mock, shouldShow unchanged)
    expect(getByText("+5 Barrel Points")).toBeTruthy();
  });

  // 8 — hero image slot is wired with a swappable testID
  it("renders a hero image with testID 'daily-bonus-hero'", () => {
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 1 };
    const { getByTestId } = render(<DailyBonusScreen />);
    expect(getByTestId("daily-bonus-hero")).toBeTruthy();
  });

  // 9 — card background comes from theme token, not a hardcoded hex
  it("card background reads brand800 from activeTheme, not a hardcoded hex", () => {
    mockThemeColors = { ...mockDefaultColors, brand800: "#abcdef" };
    mockDailyBonus = { shouldShow: true, awardedPoints: 5, streakDays: 1 };
    const { getByTestId } = render(<DailyBonusScreen />);
    const card = getByTestId("daily-bonus-card");
    const styleArray = card.props.style as object[];
    const inlineStyle = Array.isArray(styleArray)
      ? (styleArray[styleArray.length - 1] as Record<string, string>)
      : (styleArray as Record<string, string>);
    expect(inlineStyle.backgroundColor).toBe("#abcdef");
  });
});
