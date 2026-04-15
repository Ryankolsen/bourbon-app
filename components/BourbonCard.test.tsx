/**
 * Unit tests for BourbonCard component.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { BourbonCard } from "./BourbonCard";

const noop = () => {};

describe("BourbonCard", () => {
  // 1. Core wiring — renders bourbon name
  it("renders the bourbon name", () => {
    render(
      <BourbonCard name="Blanton's Original" onPress={noop} />
    );
    expect(screen.getByText("Blanton's Original")).toBeTruthy();
  });

  // 2. Distillery — shown when present; absent when null
  it("renders distillery when provided", () => {
    render(
      <BourbonCard name="Blanton's" distillery="Buffalo Trace" onPress={noop} />
    );
    expect(screen.getByText("Buffalo Trace")).toBeTruthy();
  });

  it("does not render distillery when null", () => {
    render(
      <BourbonCard name="Blanton's" distillery={null} onPress={noop} />
    );
    expect(screen.queryByText(/distillery/i)).toBeNull();
  });

  // 3. Type — shown when present; absent when null
  it("renders type when provided", () => {
    render(
      <BourbonCard name="Blanton's" type="Single Barrel" onPress={noop} />
    );
    expect(screen.getByText("Single Barrel")).toBeTruthy();
  });

  it("does not render type text when null", () => {
    render(
      <BourbonCard name="Blanton's" type={null} onPress={noop} />
    );
    // No type text present — just verify name renders fine
    expect(screen.getByText("Blanton's")).toBeTruthy();
    expect(screen.queryByText("null")).toBeNull();
  });

  // 4. Proof — shown when present; absent when null
  it("renders proof when provided", () => {
    render(
      <BourbonCard name="Blanton's" proof={93} onPress={noop} />
    );
    expect(screen.getByText("93 proof")).toBeTruthy();
  });

  it("does not render proof when null", () => {
    render(
      <BourbonCard name="Blanton's" proof={null} onPress={noop} />
    );
    expect(screen.queryByText(/proof/i)).toBeNull();
  });

  // 5. Age — shown as "X yr" when present; absent when null
  it("renders age as 'X yr' when provided", () => {
    render(
      <BourbonCard name="Blanton's" age={8} onPress={noop} />
    );
    expect(screen.getByText("8 yr")).toBeTruthy();
  });

  it("does not render age when null", () => {
    render(
      <BourbonCard name="Blanton's" age={null} onPress={noop} />
    );
    expect(screen.queryByText(/ yr$/)).toBeNull();
  });

  // 6. Personal rating row — renders StarRating with "You" label
  it("renders 'You' label for personal rating", () => {
    render(
      <BourbonCard name="Blanton's" personalRating={4} onPress={noop} />
    );
    expect(screen.getByText("You")).toBeTruthy();
  });

  // 7. Community rating row — renders StarRating with "Community" label
  it("renders 'Community' label for community rating", () => {
    render(
      <BourbonCard name="Blanton's" communityRating={3.5} onPress={noop} />
    );
    expect(screen.getByText("Community")).toBeTruthy();
  });

  // 8. onPress — called when card is tapped
  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<BourbonCard name="Blanton's" onPress={onPress} />);
    fireEvent.press(screen.getByTestId("bourbon-card"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // 9. Children slot — optional children render below card details
  it("renders optional children below card details", () => {
    render(
      <BourbonCard name="Blanton's" onPress={noop}>
        <Text>Add to Collection</Text>
      </BourbonCard>
    );
    expect(screen.getByText("Add to Collection")).toBeTruthy();
  });
});
