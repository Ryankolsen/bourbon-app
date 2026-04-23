/**
 * Bourbon Dojo belt configuration — pure data, no DB dependency.
 * Consumed by client components for display calculations and by the
 * award_xp Postgres function (via matching threshold constants).
 */

export interface BeltConfig {
  level: number;
  name: string;
  flavor: string;
  minXp: number;
  /** True for belts 7–9 (Senpai tier) */
  senpai: boolean;
  /** True for belt 10 (Sensei tier) */
  sensei: boolean;
  /** Background hex color for the belt badge */
  bgColor: string;
  /** Icon/text hex color for contrast on bgColor */
  iconColor: string;
  /** Short unicode character used as the belt badge icon */
  icon: string;
}

/** Ordered list of all 10 belts, level 1 first. */
export const BELTS: BeltConfig[] = [
  {
    level: 1,
    name: 'White Dog',
    flavor: 'Raw and unaged — every master starts here',
    minXp: 0,
    senpai: false,
    sensei: false,
    bgColor: '#E5E7EB',
    iconColor: '#6B7280',
    icon: '○',
  },
  {
    level: 2,
    name: 'Corn Whiskey',
    flavor: "You've got the grain, now learn the craft",
    minXp: 200,
    senpai: false,
    sensei: false,
    bgColor: '#FCD34D',
    iconColor: '#92400E',
    icon: '◐',
  },
  {
    level: 3,
    name: 'New Oak',
    flavor: 'First time in the barrel — the journey begins',
    minXp: 600,
    senpai: false,
    sensei: false,
    bgColor: '#FB923C',
    iconColor: '#FFFFFF',
    icon: '▲',
  },
  {
    level: 4,
    name: 'Bonded',
    flavor: 'Meeting the standard, bottled in bond',
    minXp: 1500,
    senpai: false,
    sensei: false,
    bgColor: '#22C55E',
    iconColor: '#FFFFFF',
    icon: '◆',
  },
  {
    level: 5,
    name: 'Single Barrel',
    flavor: 'Standing on your own — a distinct voice',
    minXp: 3500,
    senpai: false,
    sensei: false,
    bgColor: '#3B82F6',
    iconColor: '#FFFFFF',
    icon: '★',
  },
  {
    level: 6,
    name: 'Small Batch',
    flavor: 'Refined, curated, and intentional',
    minXp: 8000,
    senpai: false,
    sensei: false,
    bgColor: '#A855F7',
    iconColor: '#FFFFFF',
    icon: '✦',
  },
  {
    level: 7,
    name: 'Barrel Proof',
    flavor: 'Full strength — no holds barred, Senpai',
    minXp: 16000,
    senpai: true,
    sensei: false,
    bgColor: '#92400E',
    iconColor: '#FFFFFF',
    icon: '✸',
  },
  {
    level: 8,
    name: 'Wheated',
    flavor: 'Rare and distinguished — few reach this mash',
    minXp: 30000,
    senpai: true,
    sensei: false,
    bgColor: '#EF4444',
    iconColor: '#FFFFFF',
    icon: '❋',
  },
  {
    level: 9,
    name: 'Single Malt',
    flavor: 'The pinnacle of craft, revered by all',
    minXp: 50000,
    senpai: true,
    sensei: false,
    bgColor: '#374151',
    iconColor: '#FFFFFF',
    icon: '✺',
  },
  {
    level: 10,
    name: 'Pappy',
    flavor: 'Legendary. The Sensei has arrived.',
    minXp: 80000,
    senpai: false,
    sensei: true,
    bgColor: '#F59E0B',
    iconColor: '#78350F',
    icon: '⭐',
  },
];

/** Human-readable labels for each XP event type. */
export const XP_EVENT_LABELS: Record<string, string> = {
  tasting_logged: 'Tasting logged',
  first_tasting_bonus: 'First tasting of this bourbon',
  collection_add: 'Added to collection',
  wishlist_add: 'Added to wishlist',
  group_share: 'Shared to group',
  group_create: 'Group created',
  group_join: 'Joined a group',
  comment_posted: 'Comment posted',
  comment_received: 'Comment received',
  like_received: 'Tasting liked',
  follow_sent: 'Followed someone',
  follower_gained: 'New follower',
  daily_checkin: 'Daily check-in',
  streak_milestone_7: '7-day streak',
  streak_milestone_30: '30-day streak',
  profile_complete: 'Profile completed',
  first_bourbon_add: 'First bourbon added',
};

/** Returns the human-readable label for a given XP event type, or the raw type as fallback. */
export function getXpEventLabel(eventType: string): string {
  return XP_EVENT_LABELS[eventType] ?? eventType;
}

/** Returns the belt config for the given level (1–10). */
export function getBeltConfig(level: number): BeltConfig {
  const belt = BELTS.find((b) => b.level === level);
  if (!belt) throw new Error(`Invalid belt level: ${level}`);
  return belt;
}

/** Returns the belt level (1–10) for the given total XP amount. */
export function getBeltForXp(xp: number): number {
  let belt = BELTS[0];
  for (const b of BELTS) {
    if (xp >= b.minXp) {
      belt = b;
    }
  }
  return belt.level;
}

/**
 * Returns the XP needed to reach the next belt.
 * Returns 0 if the user is already at the max belt (Pappy).
 */
export function getXpToNextBelt(xp: number): number {
  const currentLevel = getBeltForXp(xp);
  if (currentLevel === 10) return 0;
  const nextBelt = getBeltConfig(currentLevel + 1);
  return nextBelt.minXp - xp;
}

/**
 * Returns the progress percentage (0–100) within the current belt.
 * Returns 100 for the max belt.
 */
export function getBeltProgressPercent(xp: number): number {
  const currentLevel = getBeltForXp(xp);
  if (currentLevel === 10) return 100;

  const currentBelt = getBeltConfig(currentLevel);
  const nextBelt = getBeltConfig(currentLevel + 1);
  const range = nextBelt.minXp - currentBelt.minXp;
  const progress = xp - currentBelt.minXp;
  return Math.round((progress / range) * 100);
}
