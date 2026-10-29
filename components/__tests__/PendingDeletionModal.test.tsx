/**
 * PendingDeletionModal — accessibility roles and action wiring.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PendingDeletionModal } from "../PendingDeletionModal";

const mockCancelDeletion = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    signOut: mockSignOut,
  }),
}));

jest.mock("@/hooks/use-profile", () => ({
  usePendingDeletion: () => ({
    isPendingDeletion: true,
    pendingDeletionAt: new Date("2026-01-01T00:00:00Z"),
    cancelDeletion: mockCancelDeletion,
  }),
}));

describe("PendingDeletionModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelDeletion.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("exposes the title as a header", () => {
    render(<PendingDeletionModal />);
    expect(
      screen.getByRole("header", { name: "Account Scheduled for Deletion" })
    ).toBeTruthy();
  });

  it("Cancel Deletion button calls cancelDeletion", async () => {
    render(<PendingDeletionModal />);
    fireEvent.press(screen.getByRole("button", { name: "Cancel deletion" }));
    await waitFor(() => expect(mockCancelDeletion).toHaveBeenCalledTimes(1));
  });

  it("Sign Out button calls signOut", async () => {
    render(<PendingDeletionModal />);
    fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
