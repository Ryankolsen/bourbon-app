/**
 * Streak utility functions — pure, no DB dependency.
 * Mirror these thresholds in the check_in() SQL function.
 */

export const STREAK_MILESTONE_7 = 7;
export const STREAK_MILESTONE_30 = 30;

export interface TomorrowXp {
  /** Tomorrow's base XP = currentStreakDays + 1 */
  base: number;
  /** Bonus XP awarded at milestone days (7 or 30), else 0 */
  bonusXp: number;
  /** Human-readable milestone label, or null on non-milestone days */
  milestoneLabel: string | null;
}

/**
 * Compute the XP breakdown a user will earn on tomorrow's check-in,
 * given their current streak length.
 *
 * @param currentStreakDays - the streak_days returned from the most recent check_in() call
 */
export function getTomorrowXp(currentStreakDays: number): TomorrowXp {
  const tomorrowDay = currentStreakDays + 1;

  if (tomorrowDay === STREAK_MILESTONE_7) {
    return { base: tomorrowDay, bonusXp: 20, milestoneLabel: "7-day streak" };
  }

  if (tomorrowDay === STREAK_MILESTONE_30) {
    return { base: tomorrowDay, bonusXp: 75, milestoneLabel: "30-day streak" };
  }

  return { base: tomorrowDay, bonusXp: 0, milestoneLabel: null };
}
