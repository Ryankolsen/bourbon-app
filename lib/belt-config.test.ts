import {
  getBeltForXp,
  getBeltConfig,
  getXpToNextBelt,
  getBeltProgressPercent,
  XP_AWARD_AMOUNTS,
  STREAK_MILESTONE_BONUSES,
} from './belt-config';

// ---------------------------------------------------------------------------
// Slice 1: core wiring — getBeltForXp boundaries
// ---------------------------------------------------------------------------

describe('getBeltForXp', () => {
  it('returns belt 1 (White Dog) for 0 XP', () => {
    expect(getBeltForXp(0)).toBe(1);
  });

  it('returns belt 2 (Corn Whiskey) for exactly 200 XP', () => {
    expect(getBeltForXp(200)).toBe(2);
  });

  it('returns belt 9 (Single Malt) for 79999 XP', () => {
    expect(getBeltForXp(79999)).toBe(9);
  });

  it('returns belt 10 (Pappy) for exactly 80000 XP', () => {
    expect(getBeltForXp(80000)).toBe(10);
  });

  it('returns belt 10 for XP well beyond the max threshold', () => {
    expect(getBeltForXp(999999)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Slice 2: content details — getBeltConfig
// ---------------------------------------------------------------------------

describe('getBeltConfig', () => {
  it('getBeltConfig(1).name equals "White Dog"', () => {
    expect(getBeltConfig(1).name).toBe('White Dog');
  });

  it('getBeltConfig(10).name equals "Pappy"', () => {
    expect(getBeltConfig(10).name).toBe('Pappy');
  });

  it('getBeltConfig(7).senpai is true', () => {
    expect(getBeltConfig(7).senpai).toBe(true);
  });

  it('getBeltConfig(10).sensei is true', () => {
    expect(getBeltConfig(10).sensei).toBe(true);
  });

  it('getBeltConfig(1).senpai is false', () => {
    expect(getBeltConfig(1).senpai).toBe(false);
  });

  it('getBeltConfig(1).sensei is false', () => {
    expect(getBeltConfig(1).sensei).toBe(false);
  });

  it('throws for an invalid belt level', () => {
    expect(() => getBeltConfig(0)).toThrow();
    expect(() => getBeltConfig(11)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Slice 3: edge cases — getXpToNextBelt and getBeltProgressPercent
// ---------------------------------------------------------------------------

describe('getXpToNextBelt', () => {
  it('returns 200 for 0 XP (belt 1 → belt 2 at 200)', () => {
    expect(getXpToNextBelt(0)).toBe(200);
  });

  it('returns 4500 for 3500 XP (belt 5 → belt 6 at 8000)', () => {
    expect(getXpToNextBelt(3500)).toBe(4500);
  });

  it('returns 0 for 80000 XP (already at max belt)', () => {
    expect(getXpToNextBelt(80000)).toBe(0);
  });

  it('returns 0 for XP beyond max belt', () => {
    expect(getXpToNextBelt(999999)).toBe(0);
  });
});

describe('getBeltProgressPercent', () => {
  it('returns 50 for 100 XP (halfway through belt 1: 0–200)', () => {
    expect(getBeltProgressPercent(100)).toBe(50);
  });

  it('returns 0 for 0 XP (start of belt 1)', () => {
    expect(getBeltProgressPercent(0)).toBe(0);
  });

  it('returns 100 for 80000 XP (max belt)', () => {
    expect(getBeltProgressPercent(80000)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Slice 4: exact threshold boundaries promote correctly
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Slice 5: XP_AWARD_AMOUNTS constant
// ---------------------------------------------------------------------------

const EXPECTED_EVENT_TYPES = [
  'tasting_logged',
  'first_tasting_bonus',
  'collection_add',
  'wishlist_add',
  'group_share',
  'group_create',
  'group_join',
  'comment_posted',
  'comment_received',
  'like_received',
  'follow_sent',
  'follower_gained',
] as const;

describe('XP_AWARD_AMOUNTS', () => {
  it('has an entry for every xp_event_type value', () => {
    expect(Object.keys(XP_AWARD_AMOUNTS).length).toBe(EXPECTED_EVENT_TYPES.length);
    for (const type of EXPECTED_EVENT_TYPES) {
      expect(XP_AWARD_AMOUNTS).toHaveProperty(type);
    }
  });

  it('contains correct values for known event types', () => {
    expect(XP_AWARD_AMOUNTS.tasting_logged).toBe(25);
    expect(XP_AWARD_AMOUNTS.collection_add).toBe(10);
    expect(XP_AWARD_AMOUNTS.group_create).toBe(50);
  });

  it('has no zero or negative values', () => {
    for (const [key, value] of Object.entries(XP_AWARD_AMOUNTS)) {
      expect(value).toBeGreaterThan(0);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Slice 6: STREAK_MILESTONE_BONUSES constant
// ---------------------------------------------------------------------------

describe('STREAK_MILESTONE_BONUSES', () => {
  it('has 20 XP bonus for a 7-day streak', () => {
    expect(STREAK_MILESTONE_BONUSES[7]).toBe(20);
  });

  it('has 75 XP bonus for a 30-day streak', () => {
    expect(STREAK_MILESTONE_BONUSES[30]).toBe(75);
  });
});

describe('threshold boundary promotions', () => {
  const thresholds: [number, number][] = [
    [0, 1],
    [200, 2],
    [600, 3],
    [1500, 4],
    [3500, 5],
    [8000, 6],
    [16000, 7],
    [30000, 8],
    [50000, 9],
    [80000, 10],
  ];

  it.each(thresholds)(
    'getBeltForXp(%i) returns belt %i at exact threshold',
    (xp, expectedBelt) => {
      expect(getBeltForXp(xp)).toBe(expectedBelt);
    },
  );

  it.each(thresholds.slice(1))(
    'getBeltForXp(%i - 1) returns belt %i - 1 (one XP below threshold)',
    (xp, expectedBelt) => {
      expect(getBeltForXp(xp - 1)).toBe(expectedBelt - 1);
    },
  );
});
