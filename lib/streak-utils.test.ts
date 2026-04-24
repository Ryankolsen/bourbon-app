import { getTomorrowXp } from "./streak-utils";

describe("getTomorrowXp", () => {
  // 1 — core wiring
  it("returns base 4, no bonus for an ordinary day (day 3)", () => {
    expect(getTomorrowXp(3)).toEqual({ base: 4, bonusXp: 0, milestoneLabel: null });
  });

  // 2 — content details
  it("returns 7-day milestone values when currentStreakDays is 6", () => {
    expect(getTomorrowXp(6)).toEqual({ base: 7, bonusXp: 20, milestoneLabel: "7-day streak" });
  });

  it("returns 30-day milestone values when currentStreakDays is 29", () => {
    expect(getTomorrowXp(29)).toEqual({ base: 30, bonusXp: 75, milestoneLabel: "30-day streak" });
  });

  // 3 — edge cases
  it("returns base 1, no bonus for first-ever check-in (currentStreakDays 0)", () => {
    expect(getTomorrowXp(0)).toEqual({ base: 1, bonusXp: 0, milestoneLabel: null });
  });

  it("returns no bonus the day after the 7-day milestone (currentStreakDays 7)", () => {
    expect(getTomorrowXp(7)).toEqual({ base: 8, bonusXp: 0, milestoneLabel: null });
  });

  it("returns no bonus the day after the 30-day milestone (currentStreakDays 30)", () => {
    expect(getTomorrowXp(30)).toEqual({ base: 31, bonusXp: 0, milestoneLabel: null });
  });
});
