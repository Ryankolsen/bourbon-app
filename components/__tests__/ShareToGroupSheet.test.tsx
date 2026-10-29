import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});
jest.mock("@/hooks/use-groups", () => ({
  useMyGroups: () => ({ data: [], isLoading: false }),
}));
jest.mock("@/hooks/use-group-feed", () => ({
  useShareTastingToGroup: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/lib/toast-provider", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

import { ShareToGroupSheet } from "@/components/ShareToGroupSheet";

describe("ShareToGroupSheet a11y", () => {
  it("Close button calls onClose", () => {
    const onClose = jest.fn();
    const { getByRole } = render(
      <ShareToGroupSheet tastingId="t" currentUserId="u" visible onClose={onClose} />
    );
    fireEvent.press(getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("title is a header", () => {
    const { getByRole } = render(
      <ShareToGroupSheet tastingId="t" currentUserId="u" visible onClose={() => {}} />
    );
    expect(getByRole("header", { name: "Share to Group" })).toBeTruthy();
  });
});
