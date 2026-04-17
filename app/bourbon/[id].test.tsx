/**
 * Tests for the admin delete flow on the Bourbon Detail screen (issue #87).
 *
 * Verifies:
 * 1. Delete button is visible for admins
 * 2. Tapping Delete shows confirmation dialog with impact counts
 * 3. Cancel does not invoke useDeleteBourbon
 */

import React from 'react';
import { Alert } from 'react-native';
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

jest.mock('@/hooks/use-bourbons', () => ({
  useBourbon: () => ({
    data: {
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
    },
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
  });

  // Slice 4 — confirmation dialog shows counts
  it('shows Delete button for admin and dialog contains impact counts when tapped', () => {
    mockIsAdmin = true;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<BourbonDetailScreen />);

    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeTruthy();

    fireEvent.press(deleteButton);

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Bourbon',
      expect.stringContaining('3 tasting notes'),
      expect.any(Array)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Bourbon',
      expect.stringContaining('12 collection entries'),
      expect.any(Array)
    );

    alertSpy.mockRestore();
  });

  // Slice 5 — cancel does not delete
  it('does NOT call useDeleteBourbon when Cancel is pressed in the confirmation dialog', () => {
    mockIsAdmin = true;

    let capturedButtons: Array<{ text: string; onPress?: () => void }> = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      capturedButtons = (buttons ?? []) as typeof capturedButtons;
    });

    render(<BourbonDetailScreen />);
    fireEvent.press(screen.getByText('Delete'));

    const cancelButton = capturedButtons.find((b) => b.text === 'Cancel');
    expect(cancelButton).toBeTruthy();
    cancelButton?.onPress?.();

    expect(mockDeleteMutate).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  // Confirming dialog triggers useDeleteBourbon
  it('calls useDeleteBourbon when the Delete button in the dialog is confirmed', () => {
    mockIsAdmin = true;

    let capturedButtons: Array<{ text: string; onPress?: () => void }> = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      capturedButtons = (buttons ?? []) as typeof capturedButtons;
    });

    render(<BourbonDetailScreen />);
    fireEvent.press(screen.getByText('Delete'));

    const confirmButton = capturedButtons.find((b) => b.text === 'Delete');
    expect(confirmButton).toBeTruthy();
    confirmButton?.onPress?.();

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      'bourbon-delete-id',
      expect.any(Object)
    );

    jest.restoreAllMocks();
  });
});
