/**
 * Integration tests for the Bourbon Dojo section of the profile screen.
 *
 * Covers: ⓘ trigger button wiring, modal open/close, XP pass-through,
 * and no-regression on existing Bourbon Dojo section components.
 *
 * Pattern: render the full profile screen with mocked hooks; isolate
 * assertions to the Bourbon Dojo section and modal.
 */

import React from "react";
import { render, fireEvent, within } from "@testing-library/react-native";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    signOut: jest.fn(),
  }),
}));

jest.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    data: { display_name: "Test User", username: "testuser", avatar_url: null },
    isLoading: false,
  }),
  useUpdateProfile: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUploadAvatar: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteAccount: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/use-follows", () => ({
  useFollowerCount: () => ({ data: 5 }),
  useFollowingCount: () => ({ data: 3 }),
}));

const mockUseUserXp = jest.fn();
jest.mock("@/hooks/use-user-xp", () => ({
  useUserXp: (...args: unknown[]) => mockUseUserXp(...args),
}));

jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    themeMode: "dark",
    setThemeMode: jest.fn(),
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

jest.mock("@/lib/toast-provider", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("@/components/BeltBadge", () => ({
  BeltBadge: ({ level }: { level: number }) => {
    const { View, Text } = require("react-native");
    return (
      <View testID="belt-badge">
        <Text>{`Belt ${level}`}</Text>
      </View>
    );
  },
}));

jest.mock("@/components/XpProgressBar", () => ({
  XpProgressBar: () => {
    const { View } = require("react-native");
    return <View testID="xp-progress-bar" />;
  },
}));

jest.mock("@/components/StreakCard", () => ({
  StreakCard: () => {
    const { View } = require("react-native");
    return <View testID="streak-card" />;
  },
}));

jest.mock("@/components/AchievementSection", () => ({
  AchievementSection: () => {
    const { View } = require("react-native");
    return <View testID="achievement-section" />;
  },
}));

// Importing expo-router is not needed for profile, but just in case
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import ProfileScreen from "../../app/(tabs)/profile";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeXpState(totalXp: number) {
  return {
    totalXp,
    currentBelt: 5,
    beltName: "Single Barrel",
    xpToNextBelt: 1000,
    progressPercent: 50,
    streakDays: 3,
    lastCheckinDate: null,
    isLoading: false,
    error: null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Profile — Bourbon Dojo section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserXp.mockReturnValue(makeXpState(3500));
  });

  // 1 — Core wiring: ⓘ trigger button is visible
  it("renders the dojo-guide-trigger button in the Bourbon Dojo section", () => {
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId("dojo-guide-trigger")).toBeTruthy();
  });

  // 2 — Opens modal: pressing ⓘ shows DojoGuideModal content
  it("opens DojoGuideModal when the ⓘ button is pressed", () => {
    const { getByTestId, getByText } = render(<ProfileScreen />);

    fireEvent.press(getByTestId("dojo-guide-trigger"));

    // DojoGuideModal is now visible — "White Dog" is a known belt name in the modal
    expect(getByText("White Dog")).toBeTruthy();
  });

  // 3 — Passes correct XP: Single Barrel (belt 5) row is highlighted for totalXp=3500
  it("passes totalXp to DojoGuideModal so the correct belt row is highlighted", () => {
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId("dojo-guide-trigger"));

    const currentRow = getByTestId("belt-row-current");
    expect(within(currentRow).getByText("Single Barrel")).toBeTruthy();
  });

  // 4 — No regression: BeltBadge, XpProgressBar, and StreakCard still render
  it("still renders BeltBadge, XpProgressBar, and StreakCard in the Bourbon Dojo section", () => {
    const { getByTestId } = render(<ProfileScreen />);

    expect(getByTestId("belt-badge")).toBeTruthy();
    expect(getByTestId("xp-progress-bar")).toBeTruthy();
    expect(getByTestId("streak-card")).toBeTruthy();
  });
});
