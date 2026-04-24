/**
 * Unit tests for XpToast component.
 *
 * Pattern: render XpToast inside a custom XpContext provider that injects a
 * controlled notification, assert text and dismissal behavior.
 */

import React from "react";
import { render, act } from "@testing-library/react-native";

// ── Mock XpBurst (uses react-native-reanimated native module) ────────────────

jest.mock("@/components/XpBurst", () => ({
  XpBurst: jest.fn().mockReturnValue(null),
}));

// ── Mock XpContext ────────────────────────────────────────────────────────────

const mockAdvance = jest.fn();
let mockCurrent: {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
  streakDays?: number;
  isReset?: boolean;
  tomorrowXp?: { base: number; bonusXp: number; milestoneLabel: string | null } | null;
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

function makeCheckinNotification(overrides: Partial<typeof mockCurrent> = {}) {
  return makeNotification({
    eventType: "daily_checkin",
    label: "Daily check-in",
    streakDays: 4,
    isReset: false,
    tomorrowXp: { base: 5, bonusXp: 0, milestoneLabel: null },
    ...overrides,
  });
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

  // ── Streak line tests ──────────────────────────────────────────────────────

  // 4 — core wiring: daily_checkin renders streak context line
  it("renders streak line for daily_checkin with streakDays=4 and tomorrowXp base=5", () => {
    mockCurrent = makeCheckinNotification();
    const { getByText } = render(<XpToast />);
    expect(getByText("Day 4 streak · Tomorrow: +5 pts")).toBeTruthy();
  });

  // 5 — milestone bonus in streak line
  it("renders milestone bonus text when milestoneLabel is set", () => {
    mockCurrent = makeCheckinNotification({
      tomorrowXp: { base: 7, bonusXp: 20, milestoneLabel: "7-day streak" },
    });
    const { getByText } = render(<XpToast />);
    expect(
      getByText("Day 4 streak · Tomorrow: +7 pts + 20 bonus — 7-day streak!")
    ).toBeTruthy();
  });

  // 6 — isReset: shows reset message
  it("renders streak reset message when isReset is true", () => {
    mockCurrent = makeCheckinNotification({ isReset: true });
    const { getByText } = render(<XpToast />);
    expect(
      getByText("Streak reset — back to Day 1 · Tomorrow: +1 pt")
    ).toBeTruthy();
  });

  // 7 — non-daily_checkin event: no streak line
  it("does not render streak line for non-daily_checkin events", () => {
    mockCurrent = makeNotification({ eventType: "tasting_complete" });
    const { queryByTestId } = render(<XpToast />);
    expect(queryByTestId("streak-line")).toBeNull();
  });

  // 8 — daily_checkin without tomorrowXp: no streak line rendered
  it("does not render streak line when tomorrowXp is null", () => {
    mockCurrent = makeCheckinNotification({ tomorrowXp: null, streakDays: 2 });
    const { queryByTestId } = render(<XpToast />);
    expect(queryByTestId("streak-line")).toBeNull();
  });
});
