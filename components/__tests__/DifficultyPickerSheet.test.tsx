import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({ activeTheme: { colors: {} } }),
}));

import { DifficultyPickerSheet } from "@/components/DifficultyPickerSheet";

function setup(onClose = jest.fn()) {
  return render(
    <DifficultyPickerSheet visible gameTitle="Game" onSelect={jest.fn()} onClose={onClose} />
  );
}

describe("DifficultyPickerSheet a11y", () => {
  it("Close button calls onClose", () => {
    const onClose = jest.fn();
    const { getAllByRole } = setup(onClose);
    const closes = getAllByRole("button", { name: "Close" });
    fireEvent.press(closes[closes.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it("title is a header", () => {
    const { getByRole } = setup();
    expect(getByRole("header", { name: "Choose Difficulty" })).toBeTruthy();
  });

  it("selected difficulty has accessibilityState.selected", () => {
    const { getByRole } = setup();
    expect(getByRole("radio", { name: /Standard/ }).props.accessibilityState.selected).toBe(true);
    expect(getByRole("radio", { name: /Training/ }).props.accessibilityState.selected).toBe(false);
    fireEvent.press(getByRole("radio", { name: /Challenge/ }));
    expect(getByRole("radio", { name: /Challenge/ }).props.accessibilityState.selected).toBe(true);
    expect(getByRole("radio", { name: /Standard/ }).props.accessibilityState.selected).toBe(false);
  });
});
