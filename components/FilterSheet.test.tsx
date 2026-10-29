import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FilterSheet } from "./FilterSheet";
import { DEFAULT_BOURBON_FILTERS } from "@/lib/bourbons";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@/hooks/use-distilleries", () => ({ useDistilleries: () => ({ distilleries: [], isLoading: false }) }));
jest.mock("@/components/SearchablePicker", () => ({ SearchablePicker: () => null }));
jest.mock("@miblanchard/react-native-slider", () => ({ Slider: () => null }));

describe("FilterSheet accessibility", () => {
  it("has a Close button and a Filter & Sort header", () => {
    const onClose = jest.fn();
    render(<FilterSheet visible filters={DEFAULT_BOURBON_FILTERS} onApply={jest.fn()} onClose={onClose} />);
    expect(screen.getByRole("header", { name: "Filter & Sort" })).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("exposes selected state on type options", () => {
    render(<FilterSheet visible filters={{ ...DEFAULT_BOURBON_FILTERS, types: ["wheated"] }} onApply={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Wheated" }).props.accessibilityState).toMatchObject({ selected: true });
  });
});
