import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { StarRatingInput, STAR_LABELS } from "./StarRatingInput";

function act(el: any, actionName: string) {
  fireEvent(el, "accessibilityAction", { nativeEvent: { actionName } });
}

describe("StarRatingInput", () => {
  it("exposes one adjustable Rating element; increment from null gives 1", () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <StarRatingInput value={null} onChange={onChange} labels={STAR_LABELS} />
    );
    const el = getByRole("adjustable", { name: "Rating" });
    expect(el.props.accessibilityValue.text).toBe("Not rated");
    act(el, "increment");
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("reports value text and handles decrement, clear and capped increment", () => {
    const onChange = jest.fn();
    const { getByRole, rerender } = render(
      <StarRatingInput value={3} onChange={onChange} labels={STAR_LABELS} />
    );
    expect(getByRole("adjustable", { name: "Rating" }).props.accessibilityValue).toEqual({
      min: 0,
      max: 5,
      now: 3,
      text: `3 of 5, ${STAR_LABELS[3]}`,
    });
    act(getByRole("adjustable", { name: "Rating" }), "clear");
    expect(onChange).toHaveBeenLastCalledWith(null);

    rerender(<StarRatingInput value={1} onChange={onChange} labels={STAR_LABELS} />);
    act(getByRole("adjustable", { name: "Rating" }), "decrement");
    expect(onChange).toHaveBeenLastCalledWith(null);

    rerender(<StarRatingInput value={5} onChange={onChange} labels={STAR_LABELS} />);
    act(getByRole("adjustable", { name: "Rating" }), "increment");
    expect(onChange).toHaveBeenLastCalledWith(5);

    rerender(<StarRatingInput value={2} onChange={onChange} labels={STAR_LABELS} />);
    act(getByRole("adjustable", { name: "Rating" }), "increment");
    expect(onChange).toHaveBeenLastCalledWith(3);
    act(getByRole("adjustable", { name: "Rating" }), "decrement");
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("declares a Clear rating custom action", () => {
    const { getByRole } = render(
      <StarRatingInput value={2} onChange={jest.fn()} labels={STAR_LABELS} />
    );
    const actions = getByRole("adjustable", { name: "Rating" }).props.accessibilityActions;
    expect(actions).toEqual(expect.arrayContaining([{ name: "clear", label: "Clear rating" }]));
  });

  it("tapping a star sets it; tapping the selected star clears", () => {
    const onChange = jest.fn();
    const { getByTestId, rerender } = render(
      <StarRatingInput value={null} onChange={onChange} labels={STAR_LABELS} />
    );
    fireEvent.press(getByTestId("rating-star-4"));
    expect(onChange).toHaveBeenLastCalledWith(4);
    rerender(<StarRatingInput value={4} onChange={onChange} labels={STAR_LABELS} />);
    fireEvent.press(getByTestId("rating-star-4"));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("shows the visible rating caption when set", () => {
    const { getByText } = render(
      <StarRatingInput value={4} onChange={jest.fn()} labels={STAR_LABELS} />
    );
    expect(getByText(`4/5 — ${STAR_LABELS[4]}`)).toBeTruthy();
  });
});
