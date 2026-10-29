import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AnswerChoice } from "./AnswerChoice";

describe("AnswerChoice", () => {
  it("idle press calls onPress", () => {
    const fn = jest.fn();
    render(<AnswerChoice text="Buffalo Trace" state="idle" onPress={fn} />);
    fireEvent.press(screen.getByRole("button", { name: "Buffalo Trace" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("correct state shows feedback and is disabled", () => {
    render(<AnswerChoice text="Buffalo Trace" state="correct" onPress={jest.fn()} />);
    expect(screen.getByText("✓ Correct")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Buffalo Trace, Correct" });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it("wrong state shows ✗ Your answer", () => {
    render(<AnswerChoice text="Wild Turkey" state="wrong" onPress={jest.fn()} />);
    expect(screen.getByText("✗ Your answer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wild Turkey, Your answer" })).toBeTruthy();
  });

  it("custom notes replace the defaults", () => {
    render(
      <AnswerChoice text="n" state="correct" onPress={jest.fn()} correctNote="This was the fake ✓" />
    );
    expect(screen.getByText("This was the fake ✓")).toBeTruthy();
    expect(screen.queryByText("✓ Correct")).toBeNull();
  });

  it("disabled state is disabled without feedback", () => {
    const fn = jest.fn();
    render(<AnswerChoice text="X" state="disabled" onPress={fn} />);
    const button = screen.getByRole("button", { name: "X" });
    expect(button.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(button);
    expect(fn).not.toHaveBeenCalled();
  });
});
