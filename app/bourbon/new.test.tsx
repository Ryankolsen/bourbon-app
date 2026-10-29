/**
 * Tests for Phase 3 of #53: country/state/province dropdown behavior in NewBourbonScreen.
 *
 * Verifies:
 * 1. State/province field clears when country changes
 * 2. State/province field is hidden when selected country has no province data
 * 3. State/province field is shown when selected country has province data
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import NewBourbonScreen from './new';
import { announce } from '@/lib/announce';

jest.mock('@/lib/announce', () => ({ announce: jest.fn() }));

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

jest.mock('@/hooks/use-bourbons', () => ({
  useAddBourbon: () => ({ mutate: jest.fn(), isPending: false }),
  useSearchSimilarBourbons: () => ({ data: [] }),
}));

jest.mock('@/hooks/use-distilleries', () => ({
  useDistilleries: () => ({ distilleries: [], isLoading: false }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/lib/bourbons', () => ({
  buildBourbonInsertPayload: jest.fn(() => ({ name: 'test' })),
  BOURBON_TYPES: [
    { label: 'Traditional', value: 'traditional' },
    { label: 'Small Batch', value: 'small_batch' },
  ],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Testable Dropdown mock: renders all options as pressable items
jest.mock('react-native-element-dropdown', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Dropdown: ({ data, value, onChange, placeholder, testID }: any) => (
      <View testID={testID}>
        <Text testID={`${testID}-selected`}>{value ?? ''}</Text>
        {(data ?? []).map((item: any) => (
          <TouchableOpacity
            key={item.value}
            testID={`${testID}-option-${item.value}`}
            onPress={() => onChange(item)}
          >
            <Text>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NewBourbonScreen — country/state dropdowns', () => {
  it('shows the state/province dropdown when country has province data', () => {
    render(<NewBourbonScreen />);

    // Select USA (has states)
    fireEvent.press(screen.getByTestId('country-dropdown-option-US'));

    expect(screen.getByTestId('state-dropdown')).toBeTruthy();
  });

  it('hides the state/province dropdown when country has no province data', () => {
    render(<NewBourbonScreen />);

    // Select "Other" (no provinces)
    fireEvent.press(screen.getByTestId('country-dropdown-option-Other'));

    expect(screen.queryByTestId('state-dropdown')).toBeNull();
  });

  it('clears the state value when country changes', () => {
    render(<NewBourbonScreen />);

    // Select USA and pick Kentucky
    fireEvent.press(screen.getByTestId('country-dropdown-option-US'));
    fireEvent.press(screen.getByTestId('state-dropdown-option-KY'));
    expect(screen.getByTestId('state-dropdown-selected').props.children).toBe('KY');

    // Change to Japan (also has provinces, so the dropdown stays visible — but value resets)
    fireEvent.press(screen.getByTestId('country-dropdown-option-JP'));
    expect(screen.getByTestId('state-dropdown-selected').props.children).toBe('');
  });
});

describe('NewBourbonScreen — accessibility', () => {
  beforeEach(() => (announce as jest.Mock).mockClear());

  it('finds text fields by label and accepts input', () => {
    render(<NewBourbonScreen />);
    for (const label of ['Name *', 'Proof *', 'Age Statement (years)', 'Mashbill', 'MSRP ($)', 'Description', 'City']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    fireEvent.changeText(screen.getByLabelText('Name *'), "Blanton's");
    expect(screen.getByLabelText('Name *').props.value).toBe("Blanton's");
  });

  it('renders the title as a header', () => {
    render(<NewBourbonScreen />);
    expect(screen.getByRole('header', { name: 'Add a Bourbon' })).toBeTruthy();
  });

  it('finds the submit and cancel buttons by role', () => {
    render(<NewBourbonScreen />);
    expect(screen.getByRole('button', { name: 'Add Bourbon' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('exposes type chips as buttons with selected state', () => {
    render(<NewBourbonScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Small Batch' }));
    expect(screen.getByRole('button', { name: 'Small Batch' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
  });

  it('shows a missing-required error once and announces it', async () => {
    render(<NewBourbonScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Add Bourbon' }));
    expect(await screen.findAllByText('Name is required')).toHaveLength(1);
    expect(announce).toHaveBeenCalledWith('Name is required');
  });
});
