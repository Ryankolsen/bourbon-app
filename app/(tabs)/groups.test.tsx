import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import GroupsScreen from './groups';

const mockRouterPush = jest.fn();
const mockCreateMutate = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/use-groups', () => ({
  useMyGroups: () => ({ data: [], isLoading: false }),
  useGroupInvites: () => ({ data: [], isLoading: false }),
  useCreateGroup: () => ({ mutate: mockCreateMutate, isPending: false }),
  useAcceptGroupInvite: () => ({ mutate: jest.fn(), isPending: false }),
  useDeclineGroupInvite: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-group-notifications', () => ({
  useGroupNotifications: () => ({ data: [] }),
  useDismissGroupNotification: () => ({ mutate: jest.fn(), isPending: false }),
  useGroupNotificationsRealtime: () => {},
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() })) },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({
    activeTheme: { colors: { placeholderGroup: '#999999' } },
  }),
}));

function openModal() {
  fireEvent.press(screen.getByText('+ New'));
}

describe('GroupsScreen — Create Group modal keyboard avoidance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders KeyboardAvoidingView with testID when create modal opens', () => {
    render(<GroupsScreen />);
    openModal();
    expect(screen.getByTestId('create-group-kav')).toBeTruthy();
  });

  it('renders ScrollView with keyboardShouldPersistTaps=handled when create modal opens', () => {
    render(<GroupsScreen />);
    openModal();
    const scroll = screen.getByTestId('create-group-scroll');
    expect(scroll).toBeTruthy();
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('renders Name and Description inputs inside the open modal', () => {
    render(<GroupsScreen />);
    openModal();
    expect(screen.getByPlaceholderText('e.g. Friday Night Pours')).toBeTruthy();
    expect(screen.getByPlaceholderText('A short description of your group')).toBeTruthy();
  });

  it('renders Create Group and Cancel buttons inside the open modal', () => {
    render(<GroupsScreen />);
    openModal();
    expect(screen.getAllByText('Create Group').length).toBeGreaterThan(0);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });
});
