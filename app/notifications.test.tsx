/**
 * Unit tests for the notifications screen.
 *
 * Pattern: render the full screen with mocked hooks, assert on rendered output.
 * Covers the new achievement_unlocked notification type added in #195.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

jest.mock('@/hooks/use-social-notifications', () => ({
  useSocialNotifications: jest.fn(),
  useDismissSocialNotification: () => ({ mutate: jest.fn() }),
  useSocialNotificationsRealtime: jest.fn(),
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({
    activeTheme: {
      colors: {
        tabBorder: '#374151',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

import {
  useSocialNotifications,
  useSocialNotificationsRealtime,
} from '@/hooks/use-social-notifications';
import NotificationsScreen from './notifications';

const mockUseSocialNotifications = useSocialNotifications as jest.Mock;
const mockUseSocialNotificationsRealtime = useSocialNotificationsRealtime as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAchievementNotification() {
  return {
    id: 'notif-achievement-1',
    recipient_id: 'user-1',
    actor_id: null,
    type: 'achievement_unlocked' as const,
    tasting_id: null,
    metadata: { title: 'Freshman Sipper' },
    created_at: '2026-01-01T00:00:00Z',
    dismissed_at: null,
    profiles: null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationsScreen — achievement_unlocked type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocialNotificationsRealtime.mockImplementation(() => {});
  });

  // 1 — Core wiring: renders achievement_unlocked notification row
  it('renders "Achievement Unlocked: Freshman Sipper" for achievement_unlocked type', () => {
    mockUseSocialNotifications.mockReturnValue({
      data: [makeAchievementNotification()],
      isLoading: false,
    });

    render(<NotificationsScreen />);

    expect(screen.getByText('Achievement Unlocked: Freshman Sipper')).toBeTruthy();
  });

  // 2 — Edge case: no actor avatar for achievement_unlocked type
  it('does not render actor-avatar testID for achievement_unlocked notification', () => {
    mockUseSocialNotifications.mockReturnValue({
      data: [makeAchievementNotification()],
      isLoading: false,
    });

    render(<NotificationsScreen />);

    expect(screen.queryByTestId('actor-avatar')).toBeNull();
  });

  // 3 — Core wiring: actor-avatar present for follower notification
  it('renders actor-avatar for new_follower notification', () => {
    mockUseSocialNotifications.mockReturnValue({
      data: [
        {
          id: 'notif-1',
          recipient_id: 'user-1',
          actor_id: 'actor-1',
          type: 'new_follower' as const,
          tasting_id: null,
          metadata: null,
          created_at: '2026-01-01T00:00:00Z',
          dismissed_at: null,
          profiles: { display_name: 'Alice', username: 'alice', avatar_url: null },
        },
      ],
      isLoading: false,
    });

    render(<NotificationsScreen />);

    expect(screen.getByTestId('actor-avatar')).toBeTruthy();
    expect(screen.getByText('@alice is now following you')).toBeTruthy();
  });
});
