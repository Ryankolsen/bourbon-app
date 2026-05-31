import { evaluateDailyBonus } from "../daily-bonus";

describe("evaluateDailyBonus", () => {
  it("returns shouldShow: true with correct values when xp_awarded > 0", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 2 },
      today: "2026-05-30",
    });
    expect(result.shouldShow).toBe(true);
    expect(result.awardedPoints).toBe(5);
    expect(result.streakDays).toBe(5);
  });

  it("returns shouldShow: false when xp_awarded is 0", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 0, streak_days: 1, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.shouldShow).toBe(false);
  });

  // Test 1 — tomorrow points
  it("returns tomorrowPoints = streak_days + 1", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 4, streak_days: 4, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.tomorrowPoints).toBe(5);
  });

  // Test 2 — next milestone progress
  it("returns nextMilestone Day 7 when streak_days < 7", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 5, streak_days: 5, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.nextMilestone).toEqual({ day: 7, daysRemaining: 2, bonusXp: 20 });
  });

  it("returns nextMilestone Day 30 when streak_days is between 7 and 30", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 10, streak_days: 10, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.nextMilestone).toEqual({ day: 30, daysRemaining: 20, bonusXp: 75 });
  });

  // Test 3 — milestone hit
  it("returns milestoneHit: true on day 7", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 27, streak_days: 7, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.milestoneHit).toBe(true);
  });

  it("returns milestoneHit: true on day 30", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 105, streak_days: 30, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.milestoneHit).toBe(true);
  });

  // Test 4 — no milestone on normal day
  it("returns milestoneHit: false on a non-milestone day", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 4, streak_days: 4, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.milestoneHit).toBe(false);
  });

  // Test 5 — reset streak (Day 1) shows normal bonus, no special flags
  it("returns normal Day 1 bonus with milestoneHit: false after a reset", () => {
    const result = evaluateDailyBonus({
      checkInResult: { xp_awarded: 1, streak_days: 1, promoted: false, new_belt: 1 },
      today: "2026-05-30",
    });
    expect(result.awardedPoints).toBe(1);
    expect(result.milestoneHit).toBe(false);
    expect(result.tomorrowPoints).toBe(2);
    expect(result.nextMilestone).toEqual({ day: 7, daysRemaining: 6, bonusXp: 20 });
  });
});
