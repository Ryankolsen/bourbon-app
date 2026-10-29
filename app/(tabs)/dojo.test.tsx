import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DojoScreen from './dojo';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/use-game-daily-session', () => ({
  DAILY_CAP: 5,
  useGameDailySession: () => ({
    isLoading: false,
    canPlay: true,
    playsRemaining: 5,
    resetTime: new Date(Date.now() + 3600_000),
  }),
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({
    activeTheme: {
      colors: { brand800: '#222', brand300: '#ccc', tabActive: '#c60', tabInactive: '#888', white: '#fff' },
    },
  }),
}));

jest.mock('@/components/DifficultyPickerSheet', () => ({
  DifficultyPickerSheet: () => null,
}));

describe('DojoScreen — accessibility', () => {
  it('exposes the screen and game titles as headers', () => {
    render(<DojoScreen />);
    expect(screen.getByRole('header', { name: 'The Dojo' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Dojo Duel' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Pour or Faker' })).toBeTruthy();
  });

  it('exposes each Play button by game name', () => {
    render(<DojoScreen />);
    expect(screen.getByRole('button', { name: 'Play Dojo Duel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play Pour or Faker' })).toBeTruthy();
  });
});
