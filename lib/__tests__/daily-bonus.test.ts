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
});
