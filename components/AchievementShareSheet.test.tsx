import React from "react";
import { Platform } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import { BELTS, BELT_SHARE_COPY } from "@/lib/belt-config";
import { LANDING_PAGE_URL } from "@/lib/public-links";

const mockUseShareAchievement = jest.fn();

jest.mock("@/hooks/use-share-achievement", () => ({
  useShareAchievement: (...args: unknown[]) => mockUseShareAchievement(...args),
}));

jest.mock("@/components/AchievementShareCard", () => ({
  AchievementShareCard: () => null,
}));

import { AchievementShareSheet } from "./AchievementShareSheet";

const LANDING = LANDING_PAGE_URL;
const belt = BELTS[3]; // level 4

describe("AchievementShareSheet share text", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    mockUseShareAchievement.mockReset();
    mockUseShareAchievement.mockReturnValue({
      cardRef: { current: null },
      share: jest.fn(),
      isSharing: false,
    });
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it.each(["ios", "android"] as const)(
    "appends the landing page URL on %s",
    (os) => {
      Platform.OS = os;
      render(<AchievementShareSheet visible belt={belt} onClose={() => {}} />);
      const shareText = mockUseShareAchievement.mock.calls[0][1];
      expect(shareText).toBe(`${BELT_SHARE_COPY[4]} ${LANDING}`);
      expect(shareText.endsWith(` ${LANDING}`)).toBe(true);
    },
  );
});

describe("AchievementShareSheet a11y", () => {
  beforeEach(() => {
    mockUseShareAchievement.mockReturnValue({
      cardRef: { current: null },
      share: jest.fn(),
      isSharing: false,
    });
  });

  it("Close button calls onClose", () => {
    const onClose = jest.fn();
    const { getByRole } = render(<AchievementShareSheet visible belt={belt} onClose={onClose} />);
    fireEvent.press(getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("title is a header", () => {
    const { getByRole } = render(<AchievementShareSheet visible belt={belt} onClose={() => {}} />);
    expect(getByRole("header", { name: "Share Your Achievement" })).toBeTruthy();
  });
});
