import { getTomorrowXp, STREAK_MILESTONE_7, STREAK_MILESTONE_30 } from "./streak-utils";

export interface CheckInResult {
  xp_awarded: number;
  streak_days: number;
  promoted: boolean;
  new_belt: number;
}

export interface NextMilestone {
  day: number;
  daysRemaining: number;
  bonusXp: number;
}

export interface DailyBonusRecord {
  awardedPoints: number;
  streakDays: number;
  milestoneHit: boolean;
  tomorrowPoints: number;
  nextMilestone: NextMilestone | null;
  acknowledged: boolean;
}

export interface DailyBonusDecision {
  shouldShow: boolean;
  awardedPoints: number;
  streakDays: number;
  tomorrowPoints: number;
  nextMilestone: NextMilestone | null;
  milestoneHit: boolean;
}

export function evaluateDailyBonus(params: {
  checkInResult: CheckInResult;
  today: string;
  cachedRecord?: DailyBonusRecord | null;
}): DailyBonusDecision {
  const { xp_awarded, streak_days } = params.checkInResult;
  if (xp_awarded <= 0) {
    const { cachedRecord } = params;
    if (cachedRecord && !cachedRecord.acknowledged) {
      return {
        shouldShow: true,
        awardedPoints: cachedRecord.awardedPoints,
        streakDays: cachedRecord.streakDays,
        tomorrowPoints: cachedRecord.tomorrowPoints,
        nextMilestone: cachedRecord.nextMilestone,
        milestoneHit: cachedRecord.milestoneHit,
      };
    }
    return {
      shouldShow: false,
      awardedPoints: 0,
      streakDays: 0,
      tomorrowPoints: 0,
      nextMilestone: null,
      milestoneHit: false,
    };
  }

  const tomorrowPoints = getTomorrowXp(streak_days).base;

  let nextMilestone: NextMilestone | null = null;
  if (streak_days < STREAK_MILESTONE_7) {
    nextMilestone = { day: STREAK_MILESTONE_7, daysRemaining: STREAK_MILESTONE_7 - streak_days, bonusXp: 20 };
  } else if (streak_days < STREAK_MILESTONE_30) {
    nextMilestone = { day: STREAK_MILESTONE_30, daysRemaining: STREAK_MILESTONE_30 - streak_days, bonusXp: 75 };
  }

  const milestoneHit = streak_days === STREAK_MILESTONE_7 || streak_days === STREAK_MILESTONE_30;

  return {
    shouldShow: true,
    awardedPoints: xp_awarded,
    streakDays: streak_days,
    tomorrowPoints,
    nextMilestone,
    milestoneHit,
  };
}
