import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Heading } from "./Heading";

describe("Heading", () => {
  it("is exposed as a header with its text as the name", () => {
    render(<Heading>Log Tasting</Heading>);
    expect(screen.getByRole("header", { name: "Log Tasting" })).toBeTruthy();
  });

  it("passes style and testID through to the rendered node", () => {
    render(
      <Heading style={{ color: "red" }} testID="title">
        Log Tasting
      </Heading>
    );
    const node = screen.getByTestId("title");
    expect(node.props.style).toEqual(
      expect.objectContaining({ color: "red" })
    );
  });
});
