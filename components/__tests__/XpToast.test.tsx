/**
 * Unit tests for XpToast component.
 *
 * Pattern: render XpToast inside a custom XpContext provider that injects a
 * controlled notification, assert text and dismissal behavior.
 */

import React from "react";
import { render, act } from "@testing-library/react-native";

// ── Mock XpContext ────────────────────────────────────────────────────────────

const mockAdvance = jest.fn();
let mockCurrent: {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
} | null = null;

jest.mock("@/context/xp-context", () => ({
  useXpNotification: () => ({
    current: mockCurrent,
    advance: mockAdvance,
  }),
}));

import { XpToast } from "../XpToast";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<typeof mockCurrent> = {}) {
  return {
    id: "notif-1",
    xpAwarded: 25,
    eventType: "tasting_logged",
    label: "Tasting logged",
    promoted: false,
    newBelt: 1,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("XpToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCurrent = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // 1 — core wiring: renders the notification text
  it("renders '+25 Barrel Points · Tasting logged' when notification is pending", () => {
    mockCurrent = makeNotification();
    const { getByText } = render(<XpToast />);
    expect(getByText("+25 Barrel Points · Tasting logged")).toBeTruthy();
  });

  // 2 — content details: visible immediately on notification
  it("toast is visible immediately on first render with a notification", () => {
    mockCurrent = makeNotification({ xpAwarded: 10, label: "Added to collection" });
    const { getByText } = render(<XpToast />);
    expect(getByText("+10 Barrel Points · Added to collection")).toBeTruthy();
  });

  // 2b — auto-dismiss: after 2500ms advance() is called
  it("calls advance after 2500ms auto-dismiss timer", () => {
    mockCurrent = makeNotification();
    render(<XpToast />);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(mockAdvance).toHaveBeenCalledTimes(1);
  });

  // 3a — edge case: no notification pending → toast not rendered
  it("renders nothing when no notification is pending", () => {
    mockCurrent = null;
    const { queryByText } = render(<XpToast />);
    expect(queryByText(/Barrel Points/)).toBeNull();
  });

  // 3b — edge case: xpAwarded === 0 → toast not rendered
  it("renders nothing when xpAwarded is 0", () => {
    mockCurrent = makeNotification({ xpAwarded: 0 });
    const { queryByText } = render(<XpToast />);
    expect(queryByText(/Barrel Points/)).toBeNull();
  });
});
