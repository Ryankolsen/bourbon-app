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
  },
  {
    level: 2,
    name: 'Corn Whiskey',
    flavor: "You've got the grain, now learn the craft",
    minXp: 200,
    senpai: false,
    sensei: false,
  },
  {
    level: 3,
    name: 'New Oak',
    flavor: 'First time in the barrel — the journey begins',
    minXp: 600,
    senpai: false,
    sensei: false,
  },
  {
    level: 4,
    name: 'Bonded',
    flavor: 'Meeting the standard, bottled in bond',
    minXp: 1500,
    senpai: false,
    sensei: false,
  },
  {
    level: 5,
    name: 'Single Barrel',
    flavor: 'Standing on your own — a distinct voice',
    minXp: 3500,
    senpai: false,
    sensei: false,
  },
  {
    level: 6,
    name: 'Small Batch',
    flavor: 'Refined, curated, and intentional',
    minXp: 8000,
    senpai: false,
    sensei: false,
  },
  {
    level: 7,
    name: 'Barrel Proof',
    flavor: 'Full strength — no holds barred, Senpai',
    minXp: 16000,
    senpai: true,
    sensei: false,
  },
  {
    level: 8,
    name: 'Wheated',
    flavor: 'Rare and distinguished — few reach this mash',
    minXp: 30000,
    senpai: true,
    sensei: false,
  },
  {
    level: 9,
    name: 'Single Malt',
    flavor: 'The pinnacle of craft, revered by all',
    minXp: 50000,
    senpai: true,
    sensei: false,
  },
  {
    level: 10,
    name: 'Pappy',
    flavor: 'Legendary. The Sensei has arrived.',
    minXp: 80000,
    senpai: false,
    sensei: true,
  },
];

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
