import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ConfirmationModal } from "./ConfirmationModal";

describe("ConfirmationModal", () => {
  it("renders title and message when visible", () => {
    render(
      <ConfirmationModal
        visible
        title="Delete Bourbon"
        message="This cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("Delete Bourbon")).toBeTruthy();
    expect(screen.getByText("This cannot be undone.")).toBeTruthy();
  });

  it("calls onConfirm when confirm button is tapped", () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationModal
        visible
        title="Confirm"
        message="Are you sure?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    fireEvent.press(screen.getByText("Yes"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is tapped", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmationModal
        visible
        title="Confirm"
        message="Are you sure?"
        cancelLabel="No"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    fireEvent.press(screen.getByText("No"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("applies destructive styling to confirm button when destructive=true", () => {
    render(
      <ConfirmationModal
        visible
        title="Delete"
        message="This will be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    // The destructive button should render with the destructive testID
    expect(screen.getByTestId("confirm-button-destructive")).toBeTruthy();
  });
});
