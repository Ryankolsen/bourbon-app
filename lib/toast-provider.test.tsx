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

  it("labels the tappable toast with its message", () => {
    const { getByLabelText } = render(
      <ToastProvider>
        <Trigger onPress={() => {}} />
      </ToastProvider>
    );
    expect(getByLabelText("Added to your vault")).toBeTruthy();
  });
});
