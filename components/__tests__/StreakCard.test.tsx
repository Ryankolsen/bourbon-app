/**
 * Unit tests for StreakCard component.
 *
 * Pattern: render StreakCard with explicit props, query by testID and text.
 * No Supabase mocks needed — component is props-only.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { StreakCard } from "../StreakCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const baseTomorrowXp = { base: 5, bonusXp: 0, milestoneLabel: null };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StreakCard", () => {
  // 1 — core wiring: renders streak headline
  it("renders '4-day streak' for streakDays=4, lastCheckinDate=today, isReset=false", () => {
    const { getByText } = render(
      <StreakCard
        streakDays={4}
        lastCheckinDate={todayIso()}
        tomorrowXp={baseTomorrowXp}
        isReset={false}
      />
    );
    expect(getByText(/4-day streak/)).toBeTruthy();
  });

  // 2a — calendar: 4 filled cells and 3 empty cells for a 4-day streak today
  it("fills 4 of 7 calendar cells when streakDays=4 and lastCheckinDate is today", () => {
    const { getAllByTestId } = render(
      <StreakCard
        streakDays={4}
        lastCheckinDate={todayIso()}
        tomorrowXp={baseTomorrowXp}
        isReset={false}
      />
    );
    expect(getAllByTestId("streak-day-filled")).toHaveLength(4);
    expect(getAllByTestId("streak-day-empty")).toHaveLength(3);
  });

  // 2b — tomorrow preview: base XP shown
  it("shows 'Tomorrow: +5 pts' in the tomorrow preview", () => {
    const { getByText } = render(
      <StreakCard
        streakDays={4}
        lastCheckinDate={todayIso()}
        tomorrowXp={baseTomorrowXp}
        isReset={false}
      />
    );
    expect(getByText("Tomorrow: +5 pts")).toBeTruthy();
  });

  // 2c — tomorrow preview: milestone bonus shown
  it("shows milestone bonus text when milestoneLabel is set", () => {
    const { getByText } = render(
      <StreakCard
        streakDays={4}
        lastCheckinDate={todayIso()}
        tomorrowXp={{ base: 7, bonusXp: 20, milestoneLabel: "7-day streak" }}
        isReset={false}
      />
    );
    expect(getByText("Tomorrow: +7 pts + 20 bonus — 7-day streak!")).toBeTruthy();
  });

  // 3a — edge case: isReset=true renders "Streak reset"
  it("renders 'Streak reset' headline when isReset is true", () => {
    const { getByText } = render(
      <StreakCard
        streakDays={0}
        lastCheckinDate={todayIso()}
        tomorrowXp={{ base: 1, bonusXp: 0, milestoneLabel: null }}
        isReset={true}
      />
    );
    expect(getByText(/Streak reset/)).toBeTruthy();
  });

  // 3b — edge case: streakDays=0 and lastCheckinDate=null renders no filled cells
  it("renders 7 empty cells when streakDays=0 and lastCheckinDate=null", () => {
    const { getAllByTestId } = render(
      <StreakCard
        streakDays={0}
        lastCheckinDate={null}
        tomorrowXp={{ base: 1, bonusXp: 0, milestoneLabel: null }}
        isReset={false}
      />
    );
    expect(getAllByTestId("streak-day-empty")).toHaveLength(7);
  });

  // 3c — calendar respects lastCheckinDate=yesterday (today is not filled)
  it("does not fill today's cell when lastCheckinDate is yesterday", () => {
    // streakDays=3, last checkin was yesterday → cells 1,2,3 filled, cell 0 empty
    const { getAllByTestId } = render(
      <StreakCard
        streakDays={3}
        lastCheckinDate={yesterdayIso()}
        tomorrowXp={baseTomorrowXp}
        isReset={false}
      />
    );
    const filled = getAllByTestId("streak-day-filled");
    const empty = getAllByTestId("streak-day-empty");
    expect(filled).toHaveLength(3);
    expect(empty).toHaveLength(4);
  });
});
