/**
 * Unit tests for AchievementCard component.
 *
 * Pattern: render() + screen from @testing-library/react-native.
 * Pure component — no QueryClient or Supabase mock needed.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AchievementCard } from '../AchievementCard';
import { Database } from '@/types/database';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

const mockAchievement: AchievementRow = {
  id: 'ach-1',
  key: 'freshman_sipper',
  category: 'tasting',
  tier: 'new_make',
  title: 'Freshman Sipper',
  description: 'Log 1 tasting.',
  xp_award: 25,
  trigger_type: 'tasting_count',
  trigger_threshold: 1,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AchievementCard', () => {
  // 1 — Core wiring: renders title
  it('renders achievement title', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        earnedAt={null}
        onPress={() => {}}
      />
    );
    expect(screen.getByText('Freshman Sipper')).toBeTruthy();
  });

  // 2 — Content details: shows tier badge when earned
  it('shows tier badge when earned', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        earnedAt="2026-01-01T00:00:00Z"
        onPress={() => {}}
      />
    );
    expect(screen.getByText('New Make')).toBeTruthy();
    expect(screen.queryByTestId('achievement-locked')).toBeNull();
  });

  // 3 — Edge case: shows lock icon when not earned
  it('shows lock icon when not earned', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        earnedAt={null}
        onPress={() => {}}
      />
    );
    expect(screen.getByTestId('achievement-locked')).toBeTruthy();
  });

  // 4 — Interaction: calls onPress when tapped
  it('calls onPress when the card is tapped', () => {
    const onPress = jest.fn();
    render(
      <AchievementCard
        achievement={mockAchievement}
        earnedAt={null}
        onPress={onPress}
      />
    );
    fireEvent.press(screen.getByTestId('achievement-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // 5 — One-time achievements: no tier badge shown even when earned
  it('shows no tier badge for one-time achievements (tier null)', () => {
    const oneTimeAch: AchievementRow = {
      ...mockAchievement,
      id: 'ach-2',
      key: 'first_impressions',
      tier: null,
      title: 'First Impressions',
    };
    render(
      <AchievementCard
        achievement={oneTimeAch}
        earnedAt="2026-01-01T00:00:00Z"
        onPress={() => {}}
      />
    );
    expect(screen.queryByText('New Make')).toBeNull();
    expect(screen.queryByText('Bonded')).toBeNull();
    expect(screen.queryByText('Single Barrel')).toBeNull();
  });
});
