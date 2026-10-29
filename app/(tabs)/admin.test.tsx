import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AdminScreen from './admin';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/use-bourbon-suggestions', () => ({
  useBourbonSuggestions: () => ({ data: [{ id: 's1' }, { id: 's2' }] }),
}));

describe('AdminScreen — accessibility', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes the title as a header', () => {
    render(<AdminScreen />);
    expect(screen.getByRole('header', { name: 'Admin' })).toBeTruthy();
  });

  it('exposes the suggestions button with pending count', () => {
    render(<AdminScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Review Suggestions, 2 pending' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/suggestions');
  });

  it('exposes the theme picker button', () => {
    render(<AdminScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Theme Picker' }));
    expect(mockPush).toHaveBeenCalledWith('/dev/themes');
  });
});
