import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileScreen from './profile';
import { PRIVACY_POLICY_URL } from '@/lib/public-links';

const mockSignOut = jest.fn();
let mockUploadPending = false;
let mockProfileState: { data: unknown; isLoading: boolean } = {
  data: { display_name: 'Tester', username: 'tester', avatar_url: null },
  isLoading: false,
};

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() })) },
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 't@example.com' }, signOut: mockSignOut }),
}));

jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => mockProfileState,
  useUpdateProfile: () => ({ mutate: jest.fn(), isPending: false }),
  useUploadAvatar: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: mockUploadPending }),
  useDeleteAccount: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-follows', () => ({
  useFollowerCount: () => ({ data: 0 }),
  useFollowingCount: () => ({ data: 0 }),
}));

jest.mock('@/hooks/use-user-xp', () => ({
  useUserXp: () => ({ data: null, isLoading: false }),
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({ themeMode: 'system', setThemeMode: jest.fn(), activeTheme: { colors: {} } }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/components/BeltBadge', () => ({ BeltBadge: () => null }));
jest.mock('@/components/XpProgressBar', () => ({ XpProgressBar: () => null }));
jest.mock('@/components/StreakCard', () => ({ StreakCard: () => null }));
jest.mock('@/components/DojoGuideModal', () => ({ DojoGuideModal: () => null }));
jest.mock('@/components/AchievementSection', () => ({ AchievementSection: () => null }));

describe('ProfileScreen — Privacy Policy row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileState = {
      data: { display_name: 'Tester', username: 'tester', avatar_url: null },
      isLoading: false,
    };
  });

  it('renders the Privacy Policy row', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('opens the privacy policy URL and has link role', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<ProfileScreen />);
    const row = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(row.props.accessibilityRole).toBe('link');
    fireEvent.press(row);
    expect(spy).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it('still renders Sign Out', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('renders the row while profile is loading', () => {
    mockProfileState = { data: undefined, isLoading: true };
    render(<ProfileScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders the row when profile is null', () => {
    mockProfileState = { data: null, isLoading: false };
    render(<ProfileScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });
});

describe('ProfileScreen — accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadPending = false;
    mockProfileState = {
      data: { display_name: 'Tester', username: 'tester', avatar_url: null },
      isLoading: false,
    };
  });

  it('exposes the avatar button as "Change profile photo"', () => {
    render(<ProfileScreen />);
    const btn = screen.getByRole('button', { name: 'Change profile photo' });
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('disables the avatar button while uploading', () => {
    mockUploadPending = true;
    render(<ProfileScreen />);
    const btn = screen.getByRole('button', { name: 'Change profile photo' });
    expect(btn.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('renders section titles as headings but not the display name value', () => {
    render(<ProfileScreen />);
    expect(screen.queryByRole('header', { name: 'Tester' })).toBeNull();
    expect(screen.getByText('Tester')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Appearance' })).toBeTruthy();
  });

  it('finds the edit inputs by label', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Edit Profile' }));
    expect(screen.getByLabelText('Display Name')).toBeTruthy();
    expect(screen.getByLabelText('Username')).toBeTruthy();
  });
});
