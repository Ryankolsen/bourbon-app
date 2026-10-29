/**
 * Tests for components/CollectionTab.tsx — Remove from Vault confirmation modal
 * (issue #96: verify unified toast and confirmation modal across all screens)
 *
 * Covers:
 * 1. Tapping "Remove from Vault" opens ConfirmationModal with bourbon name
 * 2. Cancel dismisses the modal without calling removeFromCollection.mutate
 * 3. Confirm calls removeFromCollection.mutate with the correct collection entry id
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CollectionScreen from '@/components/CollectionTab';
import HomeScreen from './index';

// ── Mock data ─────────────────────────────────────────────────────────────────

const USER_ID = 'test-user';
const COLLECTION_ENTRY_ID = 'entry-1';
const BOURBON_NAME = "Blanton's Original";

const mockCollectionItem = {
  id: COLLECTION_ENTRY_ID,
  user_id: USER_ID,
  bourbon_id: 'bourbon-1',
  created_at: '2024-01-01T00:00:00Z',
  bourbons: {
    id: 'bourbon-1',
    name: BOURBON_NAME,
    distillery: 'Buffalo Trace',
    proof: 93,
    type: 'single_barrel',
    age_statement: null,
    image_url: null,
  },
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: USER_ID } }),
}));

const mockRemoveMutate = jest.fn();
jest.mock('@/hooks/use-collection', () => ({
  useCollection: () => ({
    data: [mockCollectionItem],
    isLoading: false,
    isError: false,
  }),
  useRemoveFromCollection: () => ({
    mutate: mockRemoveMutate,
    isPending: false,
  }),
}));

jest.mock('@/hooks/use-bourbon-filters', () => ({
  useBourbonFilters: () => ({
    filters: {
      types: [],
      proofMin: null,
      proofMax: null,
      ageMin: null,
      ageMax: null,
      nasOnly: false,
      distillery: null,
      sortField: null,
    },
    hasActiveFilters: false,
    applyFilters: jest.fn(),
    patchFilters: jest.fn(),
    resetFilters: jest.fn(),
    filterItems: <T,>(items: T[]) => items,
  }),
}));

jest.mock('@/hooks/use-ratings', () => ({
  useUserRatings: () => ({ data: null }),
  useAllBourbonRatingStats: () => ({ data: [] }),
}));

const mockShowToast = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

jest.mock('@/hooks/use-following-feed', () => ({
  useFollowingFeed: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/hooks/use-wishlist', () => ({
  useWishlist: () => ({ data: [], isLoading: false, isError: false }),
  useRemoveFromWishlist: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/lib/theme-provider', () => ({
  useTheme: () => ({
    activeTheme: { colors: { brand800: '#222', tabActive: '#c60', tabInactive: '#888', white: '#fff' } },
  }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/FilterSheet', () => ({
  FilterSheet: () => null,
}));

jest.mock('@/components/ActiveFilterChips', () => ({
  ActiveFilterChips: () => null,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

function pressRemoveFromVault() {
  fireEvent.press(screen.getByRole('button', { name: `Remove ${BOURBON_NAME} from vault` }));
}

describe('CollectionTab — Remove from Vault confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens ConfirmationModal with bourbon name when Remove from Vault is tapped', () => {
    render(<CollectionScreen />);

    // Button text
    pressRemoveFromVault();

    // Modal message with bourbon name
    expect(
      screen.getByText(`Remove ${BOURBON_NAME} from your vault?`)
    ).toBeTruthy();
  });

  it('does NOT call removeFromCollection when Cancel is pressed', () => {
    render(<CollectionScreen />);

    pressRemoveFromVault();
    fireEvent.press(screen.getByLabelText('Cancel'));

    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });

  it('calls removeFromCollection.mutate with correct id when Remove is confirmed', () => {
    render(<CollectionScreen />);

    pressRemoveFromVault();
    fireEvent.press(screen.getByLabelText('Remove'));

    expect(mockRemoveMutate).toHaveBeenCalledWith(
      { id: COLLECTION_ENTRY_ID, userId: USER_ID },
      expect.any(Object)
    );
  });
});

describe('HomeScreen — accessibility', () => {
  it('exposes the empty feed title as a header', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('header', { name: 'Nothing here yet' })).toBeTruthy();
  });

  it('exposes the segment switches as tabs with names', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByRole('tab', { name: 'My Collection' }));
    expect(screen.getByRole('tab', { name: 'My Collection', selected: true })).toBeTruthy();
  });
});
