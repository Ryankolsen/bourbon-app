import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});

import { AchievementDetailSheet } from "@/components/AchievementDetailSheet";

const achievement = {
  id: "a1",
  title: "First Pour",
  description: "Log a tasting",
  category: "tasting",
  tier: null,
  xp_award: 10,
} as any;

describe("AchievementDetailSheet a11y", () => {
  it("Close button calls onClose", () => {
    const onClose = jest.fn();
    const { getByRole } = render(
      <AchievementDetailSheet achievement={achievement} earnedAt={null} onClose={onClose} />
    );
    fireEvent.press(getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("title is a header", () => {
    const { getByRole } = render(
      <AchievementDetailSheet achievement={achievement} earnedAt={null} onClose={() => {}} />
    );
    expect(getByRole("header", { name: "First Pour" })).toBeTruthy();
  });
});
