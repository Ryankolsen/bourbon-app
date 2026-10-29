import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WishlistScreen from './wishlist';

const mockRemove = jest.fn();
let mockWishlist: unknown[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/use-wishlist', () => ({
  useWishlist: () => ({ data: mockWishlist, isLoading: false, isError: false }),
  useRemoveFromWishlist: () => ({ mutate: mockRemove }),
}));

jest.mock('@/hooks/use-ratings', () => ({
  useUserRatings: () => ({ data: null }),
  useAllBourbonRatingStats: () => ({ data: [] }),
}));

describe('WishlistScreen — accessibility', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes the empty-state title as a header', () => {
    mockWishlist = [];
    render(<WishlistScreen />);
    expect(screen.getByRole('header', { name: 'Wishlist is empty' })).toBeTruthy();
  });

  it('exposes the remove action as a named button', () => {
    mockWishlist = [
      {
        id: 'w1',
        bourbon_id: 'b1',
        bourbons: { name: "Blanton's", distillery: 'Buffalo Trace', type: null, proof: 93, age_statement: null },
      },
    ];
    render(<WishlistScreen />);
    const remove = screen.getByRole('button', { name: "Remove Blanton's from wishlist" });
    fireEvent.press(remove);
    expect(mockRemove).toHaveBeenCalledWith({ id: 'w1', userId: 'user-1', bourbonId: 'b1' });
  });
});
