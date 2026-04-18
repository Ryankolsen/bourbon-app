/**
 * Tests for group/[id].tsx — confirmation modals and toast notifications
 * (issue #96: verify unified toast and confirmation modal across all screens)
 *
 * Covers:
 * 1. Owner sees Remove button for non-owner members; tapping it opens ConfirmationModal
 * 2. Cancel on Remove Member modal does NOT call removeGroupMember.mutate
 * 3. Confirm on Remove Member modal calls removeGroupMember.mutate
 * 4. Non-owner member sees Leave Group button; tapping it opens ConfirmationModal
 * 5. Inviting a user already in the group shows an error toast
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import GroupDetailScreen from './[id]';

// ── All mock-prefixed so Jest can hoist them alongside jest.mock() ─────────────

const mockOwnerUserId = 'user-owner';
const mockMemberUserId = 'user-member';
const mockGroupId = 'group-1';

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

const mockShowToast = jest.fn();
const mockRemoveMutate = jest.fn();
const mockLeaveMutate = jest.fn();
const mockInviteMutate = jest.fn();
const mockUpdateMutate = jest.fn();

// Mutable auth id — readable inside mock factory via closure
let mockCurrentUserId = mockOwnerUserId;

// Mutable search results — readable inside mock factory via closure
let mockProfileSearchResults: { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[] = [];

// ── Static member data (mock-prefixed to allow hoisting) ─────────────────────

const mockOwnerMember = {
  user_id: mockOwnerUserId,
  role: 'owner',
  status: 'accepted',
  profiles: { display_name: 'Alice', username: 'alice', avatar_url: null },
};

const mockRegularMember = {
  user_id: mockMemberUserId,
  role: 'member',
  status: 'accepted',
  profiles: { display_name: 'Bob', username: 'bob', avatar_url: null },
};

const mockGroup = {
  id: mockGroupId,
  name: 'Test Group',
  description: 'A test group',
  created_by: mockOwnerUserId,
  created_at: '2024-01-01T00:00:00Z',
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  useLocalSearchParams: () => ({ id: mockGroupId }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({
    activeTheme: { colors: { placeholderGroup: '#999999' } },
  }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: mockCurrentUserId } }),
}));

jest.mock('@/hooks/use-groups', () => ({
  useGroup: () => ({ data: mockGroup, isLoading: false }),
  useGroupMembers: () => ({
    data: [mockOwnerMember, mockRegularMember],
    isLoading: false,
  }),
  useGroupRecommendations: () => ({ data: [] }),
  useInviteToGroup: () => ({ mutate: mockInviteMutate, isPending: false }),
  useLeaveGroup: () => ({ mutate: mockLeaveMutate, isPending: false }),
  useUpdateGroup: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useRemoveGroupMember: () => ({ mutate: mockRemoveMutate, isPending: false }),
}));

jest.mock('@/hooks/use-profile', () => ({
  useSearchProfiles: () => ({ data: mockProfileSearchResults, isFetching: false }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GroupDetailScreen — Remove Member (owner flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUserId = mockOwnerUserId;
    mockProfileSearchResults = [];
  });

  it('shows a Remove button for a non-owner accepted member', () => {
    render(<GroupDetailScreen />);
    expect(screen.getByLabelText('Remove Bob')).toBeTruthy();
  });

  it('opens the Remove Member ConfirmationModal when Remove is tapped', () => {
    render(<GroupDetailScreen />);
    fireEvent.press(screen.getByLabelText('Remove Bob'));

    expect(screen.getByText('Remove Member')).toBeTruthy();
    expect(screen.getByText('Remove Bob from this group?')).toBeTruthy();
  });

  it('does NOT call removeGroupMember when Cancel is pressed', () => {
    render(<GroupDetailScreen />);
    fireEvent.press(screen.getByLabelText('Remove Bob'));

    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });

  it('calls removeGroupMember.mutate with the correct args when Remove is confirmed', () => {
    render(<GroupDetailScreen />);
    fireEvent.press(screen.getByLabelText('Remove Bob'));

    fireEvent.press(screen.getByLabelText('Remove'));
    expect(mockRemoveMutate).toHaveBeenCalledWith(
      { groupId: mockGroupId, userId: mockMemberUserId },
      expect.any(Object)
    );
  });
});

describe('GroupDetailScreen — Leave Group (member flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUserId = mockMemberUserId;
    mockProfileSearchResults = [];
  });

  it('shows the Leave Group button for a non-owner accepted member', () => {
    render(<GroupDetailScreen />);
    expect(screen.getByText('Leave Group')).toBeTruthy();
  });

  it('opens the Leave Group ConfirmationModal when Leave Group is tapped', () => {
    render(<GroupDetailScreen />);
    fireEvent.press(screen.getByText('Leave Group'));

    // Both the button text and modal title say "Leave Group"; check the modal message
    expect(screen.getByText('Are you sure you want to leave this group?')).toBeTruthy();
  });

  it('does NOT call leaveGroup when Cancel is pressed', () => {
    render(<GroupDetailScreen />);
    fireEvent.press(screen.getByText('Leave Group'));

    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(mockLeaveMutate).not.toHaveBeenCalled();
  });

  it('calls leaveGroup.mutate with the correct args when Leave is confirmed', () => {
    render(<GroupDetailScreen />);
    fireEvent.press(screen.getByText('Leave Group'));

    fireEvent.press(screen.getByLabelText('Leave'));
    expect(mockLeaveMutate).toHaveBeenCalledWith(
      { groupId: mockGroupId, userId: mockMemberUserId },
      expect.any(Object)
    );
  });
});

describe('GroupDetailScreen — invite toast (owner flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUserId = mockOwnerUserId;
    // Return Bob (already a member) as the search result
    mockProfileSearchResults = [
      { id: mockMemberUserId, display_name: 'Bob', username: 'bob', avatar_url: null },
    ];
  });

  it('shows an error toast when inviting a user already in the group', () => {
    render(<GroupDetailScreen />);

    // Type a username and press Find to set lookupQuery (making the result visible)
    const input = screen.getByPlaceholderText('@username or email');
    fireEvent.changeText(input, 'bob');
    fireEvent.press(screen.getByText('Find'));

    // Bob is already a member; pressing Invite should show a toast, not call mutate
    fireEvent.press(screen.getByText('Invite Bob'));

    expect(mockShowToast).toHaveBeenCalledWith(
      'Bob is already in this group.',
      'error'
    );
    expect(mockInviteMutate).not.toHaveBeenCalled();
  });
});
