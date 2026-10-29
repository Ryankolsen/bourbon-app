import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TastingsScreen from './tastings';

const mockPush = jest.fn();
let mockTastings: unknown[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/use-tastings', () => ({
  useTastings: () => ({ data: mockTastings, isLoading: false, isError: false }),
}));

describe('TastingsScreen — accessibility', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes the empty-state title as a header', () => {
    mockTastings = [];
    render(<TastingsScreen />);
    expect(screen.getByRole('header', { name: 'No tastings yet' })).toBeTruthy();
  });

  it('exposes each tasting as a named button that opens it', () => {
    mockTastings = [
      {
        id: 't1',
        rating: 8,
        nose: 'Vanilla',
        palate: null,
        finish: null,
        overall_notes: null,
        tasted_at: '2024-01-01T00:00:00Z',
        bourbons: { name: "Blanton's", distillery: 'Buffalo Trace' },
      },
    ];
    render(<TastingsScreen />);
    fireEvent.press(screen.getByRole('button', { name: "Tasting of Blanton's" }));
    expect(mockPush).toHaveBeenCalledWith('/tasting/t1');
  });
});
