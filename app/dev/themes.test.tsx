import React from "react";
import { render, screen } from "@testing-library/react-native";

jest.mock("@/lib/theme-provider", () => {
  const { THEMES } = require("@/lib/themes");
  return {
    useTheme: () => ({ activeTheme: THEMES[0], setDevThemeId: jest.fn() }),
  };
});
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));

import DevThemePickerScreen from "./themes";

describe("DevThemePickerScreen accessibility", () => {
  it("renders the screen title as a heading", () => {
    render(<DevThemePickerScreen />);
    expect(screen.getByRole("header", { name: "Dev: Theme Picker" })).toBeTruthy();
  });

  it("names each apply button after its theme", () => {
    render(<DevThemePickerScreen />);
    expect(screen.getByRole("button", { name: "Apply High Contrast theme" })).toBeTruthy();
  });
});
