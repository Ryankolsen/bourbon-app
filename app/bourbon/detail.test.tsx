/**
 * Tests for admin gating on the Bourbon Detail screen (issue #86).
 *
 * Verifies:
 * 1. Edit button is NOT visible for non-admin users
 * 2. Edit button IS visible for admin users
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BourbonDetailScreen from './[id]';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'bourbon-detail-id' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-abc' } }),
}));

jest.mock('@/hooks/use-bourbons', () => ({
  useBourbon: () => ({
    data: {
      id: 'bourbon-detail-id',
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
      id: 'user-abc',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      is_admin: mockIsAdmin,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BourbonDetailScreen — admin gating', () => {
  // Slice 1 — non-admin: Edit button is NOT shown
  it('does NOT show Edit button for a non-admin user', () => {
    mockIsAdmin = false;
    render(<BourbonDetailScreen />);
    expect(screen.queryByText('Edit')).toBeNull();
  });

  // Slice 2 — admin: Edit button IS shown
  it('shows Edit button for an admin user', () => {
    mockIsAdmin = true;
    render(<BourbonDetailScreen />);
    expect(screen.getByText('Edit')).toBeTruthy();
  });
});
