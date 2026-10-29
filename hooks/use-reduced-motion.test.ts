import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "./use-reduced-motion";

type Listener = (enabled: boolean) => void;

let listener: Listener | undefined;
let remove: jest.Mock;

beforeEach(() => {
  listener = undefined;
  remove = jest.fn();
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation(((_event: string, cb: Listener) => {
      listener = cb;
      return { remove };
    }) as unknown as typeof AccessibilityInfo.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useReducedMotion", () => {
  it("becomes true when Reduce Motion is enabled", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays false when disabled, and follows reduceMotionChanged events", async () => {
    const spy = jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(false);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(result.current).toBe(false);

    act(() => {
      listener?.(true);
    });
    expect(result.current).toBe(true);
  });

  it("removes the subscription on unmount", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
