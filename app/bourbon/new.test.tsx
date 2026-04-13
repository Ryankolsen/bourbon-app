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

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/lib/bourbons', () => ({
  buildBourbonInsertPayload: jest.fn(() => ({ name: 'test' })),
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
