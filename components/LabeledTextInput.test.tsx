import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { announce } from "@/lib/announce";
import { LabeledTextInput } from "./LabeledTextInput";

jest.mock("@/lib/announce", () => ({ announce: jest.fn() }));

beforeEach(() => {
  (announce as jest.Mock).mockClear();
});

describe("LabeledTextInput", () => {
  it("names the input by its label and forwards TextInput props", () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <LabeledTextInput label="Email" value="a" onChangeText={onChangeText} />
    );
    const input = getByLabelText("Email");
    expect(input.props.value).toBe("a");
    fireEvent.changeText(input, "hello");
    expect(onChangeText).toHaveBeenCalledWith("hello");
  });

  it("draws the label by default", () => {
    const { getByText } = render(<LabeledTextInput label="Email" />);
    expect(getByText("Email")).toBeTruthy();
  });

  it("hides the visible label but keeps the accessible name", () => {
    const { queryByText, getByLabelText } = render(
      <LabeledTextInput label="Email" hideLabel />
    );
    expect(queryByText("Email")).toBeNull();
    expect(getByLabelText("Email")).toBeTruthy();
  });

  it("shows the error and sets the accessibility hint", () => {
    const { getByText, getByLabelText } = render(
      <LabeledTextInput label="Name" error="Name is required" />
    );
    expect(getByText("Name is required")).toBeTruthy();
    expect(getByLabelText("Name").props.accessibilityHint).toBe(
      "Invalid entry: Name is required"
    );
  });

  it("announces a new error once, and again only when it changes", () => {
    const { rerender } = render(<LabeledTextInput label="Name" />);
    expect(announce).not.toHaveBeenCalled();
    rerender(<LabeledTextInput label="Name" error="Name is required" />);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith("Name is required");
    rerender(<LabeledTextInput label="Name" error="Name is required" />);
    expect(announce).toHaveBeenCalledTimes(1);
    rerender(<LabeledTextInput label="Name" error="Too long" />);
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith("Too long");
  });

  it("required: names the input without the asterisk and says required", () => {
    const { getByLabelText, queryByLabelText } = render(<LabeledTextInput label="Name" required />);
    expect(getByLabelText("Name, required")).toBeTruthy();
    expect(queryByLabelText(/\*/)).toBeNull();
  });

  it("required: still draws the asterisk visually, hidden from the screen reader", () => {
    const { getByText } = render(<LabeledTextInput label="Name" required />);
    const visible = getByText("Name *", { includeHiddenElements: true });
    expect(visible.props.accessibilityElementsHidden).toBe(true);
    expect(visible.props.importantForAccessibility).toBe("no");
  });
});
