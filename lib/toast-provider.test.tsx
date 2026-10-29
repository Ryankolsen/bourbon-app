import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@/lib/announce", () => ({ announce: jest.fn() }));

import { ToastProvider, useToast } from "@/lib/toast-provider";
import { announce } from "@/lib/announce";

function Trigger({ onPress }: { onPress?: () => void }) {
  const { showToast } = useToast();
  React.useEffect(() => {
    showToast("Added to your vault", "success", onPress);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

describe("ToastProvider", () => {
  beforeEach(() => jest.clearAllMocks());

  it("announces the message when showToast is called", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    expect(announce).toHaveBeenCalledWith("Added to your vault");
  });

  it("includes the action in the tappable toast's spoken name", () => {
    const { getByLabelText } = render(
      <ToastProvider>
        <Trigger onPress={() => {}} />
      </ToastProvider>
    );
    expect(getByLabelText("Added to your vault, Manage")).toBeTruthy();
  });

  it("announces each toast once and hides the plain toast from focus", () => {
    const { getByText } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    expect(announce).toHaveBeenCalledTimes(1);
    const view = getByText("Added to your vault", { includeHiddenElements: true }).parent!.parent!;
    expect(view.props.accessibilityElementsHidden).toBe(true);
    expect(view.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
