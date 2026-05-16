/**
 * Unit tests for AchievementSection component.
 *
 * Pattern: render full component with useAchievements mocked at the module level,
 * following the ProfileBourbonDojo pattern. AchievementDetailSheet is mocked to
 * avoid Modal complexity.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AchievementWithStatus } from '@/hooks/use-achievements';
import { Database } from '@/types/database';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseAchievements = jest.fn();
jest.mock('@/hooks/use-achievements', () => ({
  useAchievements: (...args: unknown[]) => mockUseAchievements(...args),
  useAchievementsRealtime: jest.fn(),
}));

const mockUseEarnedAchievements = jest.fn();
jest.mock('@/hooks/use-earned-achievements', () => ({
  useEarnedAchievements: (...args: unknown[]) => mockUseEarnedAchievements(...args),
}));

jest.mock('@/components/AchievementDetailSheet', () => ({
  AchievementDetailSheet: () => {
    const { View } = require('react-native');
    return <View testID="achievement-detail-sheet-mock" />;
  },
}));

// ── Mock data helpers ─────────────────────────────────────────────────────────

function makeMockAchievement(
  id: string,
  category: AchievementRow['category'],
  title: string,
  tier: AchievementRow['tier'] = null
): AchievementRow {
  return {
    id,
    key: id,
    category,
    tier,
    title,
    description: `Description for ${title}`,
    xp_award: 25,
    trigger_type: 'tasting_count',
    trigger_threshold: 1,
  };
}

const TASTING_ACHIEVEMENTS: AchievementRow[] = [
  makeMockAchievement('first_impressions', 'tasting', 'First Impressions', null),
  makeMockAchievement('freshman_sipper', 'tasting', 'Freshman Sipper', 'new_make'),
  makeMockAchievement('seasoned_palate', 'tasting', 'Seasoned Palate', 'bonded'),
  makeMockAchievement('tasting_savant', 'tasting', 'Tasting Savant', 'single_barrel'),
  makeMockAchievement('notes_to_self', 'tasting', 'Notes to Self', 'new_make'),
  makeMockAchievement('wax_poetic', 'tasting', 'Wax Poetic', 'bonded'),
  makeMockAchievement(
    'pretentious_in_the_best_way',
    'tasting',
    'Pretentious in the Best Way',
    'single_barrel'
  ),
];

// 29 total: 7 tasting + 22 collection placeholders
function makeAllMockAchievements(overrideEarnedAt?: Record<string, string>): AchievementWithStatus[] {
  const results: AchievementWithStatus[] = TASTING_ACHIEVEMENTS.map((a) => ({
    achievement: a,
    earnedAt: overrideEarnedAt?.[a.id] ?? null,
  }));

  for (let i = 0; i < 22; i++) {
    results.push({
      achievement: makeMockAchievement(`collection_${i}`, 'collection', `Collection Achievement ${i}`),
      earnedAt: null,
    });
  }

  return results;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

import { AchievementSection } from '../AchievementSection';

describe('AchievementSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAchievements.mockReturnValue({
      achievements: makeAllMockAchievements(),
      isSuccess: true,
      isPending: false,
    });
    mockUseEarnedAchievements.mockReturnValue({
      achievements: [],
      isSuccess: true,
      isPending: false,
    });
  });

  // 1 — Core wiring: collapsed by default
  it('renders collapsed by default — category tabs are not visible', () => {
    render(<AchievementSection userId="user-1" isOwnProfile />);

    expect(screen.queryByTestId('achievement-tab-tasting')).toBeNull();
    expect(screen.getByTestId('achievement-expand-button')).toBeTruthy();
  });

  // 2 — Content details: expands to show Tasting tab and Freshman Sipper card
  it('shows Tasting tab content and Freshman Sipper card after expanding', () => {
    render(<AchievementSection userId="user-1" isOwnProfile />);

    fireEvent.press(screen.getByTestId('achievement-expand-button'));

    expect(screen.getByTestId('achievement-tab-tasting')).toBeTruthy();
    expect(screen.getByText('Freshman Sipper')).toBeTruthy();
  });

  // 3 — Edge case: lock icons appear on unearned achievements in own-profile mode
  it('shows lock icons on unearned achievements in own-profile mode', () => {
    render(<AchievementSection userId="user-1" isOwnProfile />);
    fireEvent.press(screen.getByTestId('achievement-expand-button'));

    const lockIcons = screen.getAllByTestId('achievement-locked');
    expect(lockIcons.length).toBeGreaterThan(0);
  });

  // 4 — Visitor profile: hides unearned achievements
  it('hides unearned achievements on visitor profile (isOwnProfile=false)', () => {
    // All achievements unearned
    mockUseAchievements.mockReturnValue({
      achievements: makeAllMockAchievements(),
      isSuccess: true,
      isPending: false,
    });

    render(<AchievementSection userId="user-1" isOwnProfile={false} />);
    fireEvent.press(screen.getByTestId('achievement-expand-button'));

    // No achievement cards should be visible (all unearned)
    expect(screen.queryByTestId('achievement-card')).toBeNull();
  });

  // 5 — Visitor mode uses useEarnedAchievements and shows only earned, no lock icons
  it('hides unearned achievements in visitor mode', () => {
    const earnedAchievements = [
      { achievement: makeMockAchievement('earned_1', 'tasting', 'Earned One'), earnedAt: '2026-01-01T00:00:00Z' },
      { achievement: makeMockAchievement('earned_2', 'tasting', 'Earned Two'), earnedAt: '2026-01-02T00:00:00Z' },
      { achievement: makeMockAchievement('earned_3', 'tasting', 'Earned Three'), earnedAt: '2026-01-03T00:00:00Z' },
    ];
    mockUseEarnedAchievements.mockReturnValue({
      achievements: earnedAchievements,
      isSuccess: true,
      isPending: false,
    });

    render(<AchievementSection userId="other-user" isOwnProfile={false} />);
    fireEvent.press(screen.getByTestId('achievement-expand-button'));

    expect(screen.queryAllByTestId('achievement-locked')).toHaveLength(0);
    expect(screen.getAllByTestId('achievement-card')).toHaveLength(3);
  });

  // 6 — Tab switching: switching to Collection tab shows collection achievements
  it('switches to Collection tab and shows collection achievements', () => {
    const earnedMap = { collection_0: '2026-01-01T00:00:00Z' };
    mockUseAchievements.mockReturnValue({
      achievements: makeAllMockAchievements(earnedMap),
      isSuccess: true,
      isPending: false,
    });

    render(<AchievementSection userId="user-1" isOwnProfile />);
    fireEvent.press(screen.getByTestId('achievement-expand-button'));
    fireEvent.press(screen.getByTestId('achievement-tab-collection'));

    expect(screen.getByText('Collection Achievement 0')).toBeTruthy();
  });
});
