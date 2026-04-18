/**
 * Tests for the admin delete flow on the Bourbon Detail screen (issue #87).
 *
 * Verifies:
 * 1. Delete button is visible for admins
 * 2. Tapping Delete shows confirmation dialog with impact counts
 * 3. Cancel does not invoke useDeleteBourbon
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BourbonDetailScreen from './[id]';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush, replace: mockRouterReplace }),
  useLocalSearchParams: () => ({ id: 'bourbon-delete-id' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'admin-user-id' } }),
}));

const mockDeleteMutate = jest.fn();

type MockBourbon = {
  id: string;
  name: string;
  distillery: string | null;
  proof: number | null;
  type: string | null;
  age_statement: number | null;
  mashbill: string | null;
  msrp: number | null;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  image_url: string | null;
  submitted_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

let mockBourbonDetailData: MockBourbon = {
  id: 'bourbon-delete-id',
  name: "Blanton's Original",
  distillery: 'Buffalo Trace',
  proof: 93,
  type: 'single_barrel',
  age_statement: null,
  mashbill: null,
  msrp: null,
  description: null,
  city: null,
  state: 'Kentucky',
  country: 'USA',
  image_url: null,
  submitted_by: null,
  updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

jest.mock('@/hooks/use-bourbons', () => ({
  useBourbon: () => ({
    data: mockBourbonDetailData,
    isLoading: false,
    isError: false,
  }),
  useBourbonDeletionImpact: () => ({
    data: {
      tastings: 3,
      collection: 12,
      wishlist: 2,
      community_comments: 5,
      group_comments: 1,
    },
  }),
  useDeleteBourbon: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

jest.mock('@/hooks/use-collection', () => ({
  useAddToCollection: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-wishlist', () => ({
  useIsWishlisted: () => ({ data: null }),
  useAddToWishlist: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveFromWishlist: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-comments', () => ({
  useComments: () => ({ data: [], isLoading: false }),
  useGroupComments: () => ({ data: [], isLoading: false }),
  useAddComment: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteComment: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-ratings', () => ({
  useBourbonRatingStats: () => ({ data: null }),
  useGroupRatingStats: () => ({ data: null }),
}));

jest.mock('@/hooks/use-groups', () => ({
  useMyGroups: () => ({ data: [] }),
  useRecommendBourbon: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-friend-tasted-bourbon-ids', () => ({
  useFollowedUsersTastedCount: () => ({ data: 0 }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

// Profile mock — will be changed per test
let mockIsAdmin = false;
jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: {
      id: 'admin-user-id',
      username: 'admin',
      display_name: 'Admin User',
      avatar_url: null,
      is_admin: mockIsAdmin,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BourbonDetailScreen — admin delete flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBourbonDetailData = {
      id: 'bourbon-delete-id',
      name: "Blanton's Original",
      distillery: 'Buffalo Trace',
      proof: 93,
      type: 'single_barrel',
      age_statement: null,
      mashbill: null,
      msrp: null,
      description: null,
      city: null,
      state: 'Kentucky',
      country: 'USA',
      image_url: null,
      submitted_by: null,
      updated_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
  });

  // Slice 4 — confirmation dialog shows counts
  it('shows Delete button for admin and dialog contains impact counts when tapped', () => {
    mockIsAdmin = true;

    render(<BourbonDetailScreen />);

    // Before pressing Delete, the header Delete button is the only one
    const headerDeleteButton = screen.getByText('Delete');
    expect(headerDeleteButton).toBeTruthy();

    fireEvent.press(headerDeleteButton);

    // After pressing, the ConfirmationModal becomes visible with title and impact counts
    expect(screen.getByText('Delete Bourbon')).toBeTruthy();
    expect(screen.getByText(/3 tasting notes/)).toBeTruthy();
    expect(screen.getByText(/12 collection entries/)).toBeTruthy();
  });

  // Slice 5 — cancel does not delete
  it('does NOT call useDeleteBourbon when Cancel is pressed in the confirmation dialog', () => {
    mockIsAdmin = true;

    render(<BourbonDetailScreen />);
    fireEvent.press(screen.getByText('Delete'));

    // Modal is now visible; press Cancel
    const cancelButton = screen.getByLabelText('Cancel');
    expect(cancelButton).toBeTruthy();
    fireEvent.press(cancelButton);

    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  // Confirming dialog triggers useDeleteBourbon
  it('calls useDeleteBourbon when the Delete button in the dialog is confirmed', () => {
    mockIsAdmin = true;

    render(<BourbonDetailScreen />);
    fireEvent.press(screen.getByText('Delete'));

    // Modal is now visible; confirm via the Delete confirm button (accessibilityLabel)
    const confirmButton = screen.getByLabelText('Delete');
    expect(confirmButton).toBeTruthy();
    fireEvent.press(confirmButton);

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      'bourbon-delete-id',
      expect.any(Object)
    );
  });
});

// ── "Add Missing Info" button tests ──────────────────────────────────────────

describe('BourbonDetailScreen — Add Missing Info button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 3 — "Add Missing Info" visible for non-admin when at least one optional field is null
  it('shows "Add Missing Info" for authenticated non-admin when at least one optional field is null', () => {
    mockIsAdmin = false;
    mockBourbonDetailData = {
      id: 'bourbon-delete-id',
      name: "Blanton's Original",
      distillery: 'Buffalo Trace',
      proof: 93,
      type: 'single_barrel',
      age_statement: null,
      mashbill: null,   // null optional field
      msrp: null,
      description: null,
      city: null,
      state: 'Kentucky',
      country: 'USA',
      image_url: null,
      submitted_by: null,
      updated_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<BourbonDetailScreen />);
    expect(screen.getByText('Add Missing Info')).toBeTruthy();
  });

  // Test 4 — "Add Missing Info" hidden when all optional fields are populated
  it('hides "Add Missing Info" for non-admin when all optional fields are populated', () => {
    mockIsAdmin = false;
    mockBourbonDetailData = {
      id: 'bourbon-delete-id',
      name: "Blanton's Original",
      distillery: 'Buffalo Trace',
      proof: 93,
      type: 'single_barrel',
      age_statement: 12,
      mashbill: '75% corn',
      msrp: 49.99,
      description: 'A fine bourbon',
      city: 'Frankfort',
      state: 'Kentucky',
      country: 'USA',
      image_url: 'https://example.com/img.png',
      submitted_by: null,
      updated_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<BourbonDetailScreen />);
    expect(screen.queryByText('Add Missing Info')).toBeNull();
  });

  // Test 6 — admin sees "Edit" not "Add Missing Info"
  it('shows "Edit" for admin and NOT "Add Missing Info" even when optional fields are null', () => {
    mockIsAdmin = true;
    mockBourbonDetailData = {
      id: 'bourbon-delete-id',
      name: "Blanton's Original",
      distillery: 'Buffalo Trace',
      proof: 93,
      type: 'single_barrel',
      age_statement: null,
      mashbill: null,   // null optional field
      msrp: null,
      description: null,
      city: null,
      state: 'Kentucky',
      country: 'USA',
      image_url: null,
      submitted_by: null,
      updated_by: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<BourbonDetailScreen />);
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.queryByText('Add Missing Info')).toBeNull();
  });
});
