import React from "react";
import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AccessiblePressable } from "./AccessiblePressable";

function layout(width: number, height: number) {
  return { nativeEvent: { layout: { width, height, x: 0, y: 0 } } };
}

describe("AccessiblePressable", () => {
  it("is found by role and name and fires onPress", () => {
    const fn = jest.fn();
    render(
      <AccessiblePressable accessibilityLabel="Save" onPress={fn}>
        <Text>Save</Text>
      </AccessiblePressable>
    );
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.press(button);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows overriding the role", () => {
    render(
      <AccessiblePressable accessibilityLabel="Docs" accessibilityRole="link">
        <Text>Docs</Text>
      </AccessiblePressable>
    );
    expect(screen.getByRole("link", { name: "Docs" })).toBeTruthy();
  });

  it("sets accessibilityState.disabled when disabled", () => {
    render(
      <AccessiblePressable accessibilityLabel="Save" disabled>
        <Text>Save</Text>
      </AccessiblePressable>
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it("passes accessibilityState through", () => {
    render(
      <AccessiblePressable accessibilityLabel="Tab" accessibilityState={{ selected: true }}>
        <Text>Tab</Text>
      </AccessiblePressable>
    );
    const button = screen.getByRole("button", { name: "Tab" });
    expect(button.props.accessibilityState.selected).toBe(true);
  });

  it.each([
    [20, 20, { top: 12, bottom: 12, left: 12, right: 12 }],
    [100, 30, { top: 7, bottom: 7, left: 0, right: 0 }],
    [60, 60, { top: 0, bottom: 0, left: 0, right: 0 }],
  ])("expands hitSlop for a %ix%i layout", (w, h, expected) => {
    render(
      <AccessiblePressable accessibilityLabel="Go">
        <Text>Go</Text>
      </AccessiblePressable>
    );
    const button = screen.getByRole("button", { name: "Go" });
    fireEvent(button, "layout", layout(w, h));
    expect(screen.getByRole("button", { name: "Go" }).props.hitSlop).toEqual(expected);
  });

  it("keeps a larger caller hitSlop", () => {
    render(
      <AccessiblePressable accessibilityLabel="Go" hitSlop={20}>
        <Text>Go</Text>
      </AccessiblePressable>
    );
    const button = screen.getByRole("button", { name: "Go" });
    fireEvent(button, "layout", layout(20, 20));
    expect(screen.getByRole("button", { name: "Go" }).props.hitSlop).toEqual({
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    });
  });
});
