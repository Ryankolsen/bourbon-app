import React from "react";
import { render, act } from "@testing-library/react-native";

// The official reanimated mock needs the native worklets module, which is
// unavailable under jest, so stub the few APIs XpBurst uses.
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: number) => v,
    withSequence: (...v: number[]) => v[v.length - 1],
    runOnJS: (fn: unknown) => fn,
  };
});

let mockReduced = false;
jest.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => mockReduced,
}));

import { XpBurst, XpBurstHandle } from "../XpBurst";

describe("XpBurst", () => {
  beforeEach(() => {
    mockReduced = false;
  });

  function setup() {
    const ref = React.createRef<XpBurstHandle>();
    const utils = render(<XpBurst ref={ref} />);
    act(() => ref.current!.trigger());
    return utils;
  }

  it("renders 8 particles on trigger when Reduce Motion is off", () => {
    const { queryAllByTestId } = setup();
    expect(queryAllByTestId("xp-particle")).toHaveLength(8);
  });

  it("renders no particles on trigger when Reduce Motion is on", () => {
    mockReduced = true;
    const { queryAllByTestId } = setup();
    expect(queryAllByTestId("xp-particle")).toHaveLength(0);
  });
});
