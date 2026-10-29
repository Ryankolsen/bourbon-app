import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FilterButton } from "./FilterButton";

describe("FilterButton", () => {
  it("is named 'Filters' with no badge when no filters are active", () => {
    render(<FilterButton activeFilterCount={0} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("is named 'Filters, 2 active' and shows the count badge", () => {
    render(<FilterButton activeFilterCount={2} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Filters, 2 active" })).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("calls onPress", () => {
    const onPress = jest.fn();
    render(<FilterButton activeFilterCount={0} onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Filters" }));
    expect(onPress).toHaveBeenCalled();
  });
});
