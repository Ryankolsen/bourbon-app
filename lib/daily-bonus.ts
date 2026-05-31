export interface CheckInResult {
  xp_awarded: number;
  streak_days: number;
  promoted: boolean;
  new_belt: number;
}

export interface DailyBonusDecision {
  shouldShow: boolean;
  awardedPoints: number;
  streakDays: number;
}

export function evaluateDailyBonus(params: {
  checkInResult: CheckInResult;
  today: string;
}): DailyBonusDecision {
  const { xp_awarded, streak_days } = params.checkInResult;
  if (xp_awarded <= 0) {
    return { shouldShow: false, awardedPoints: 0, streakDays: 0 };
  }
  return { shouldShow: true, awardedPoints: xp_awarded, streakDays: streak_days };
}
