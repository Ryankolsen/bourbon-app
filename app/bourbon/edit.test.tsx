/**
 * Tests for the Edit Bourbon screen (issue #86).
 *
 * Verifies:
 * 1. Screen renders pre-filled with current bourbon field values
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EditBourbonScreen from './edit';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockRouterBack, replace: mockRouterReplace }),
  useLocalSearchParams: () => ({ id: 'bourbon-test-id' }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'admin-user-id' } }),
}));

const mockUpdateMutate = jest.fn();
jest.mock('@/hooks/use-bourbons', () => ({
  useUpdateBourbon: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useBourbon: () => ({
    data: {
      id: 'bourbon-test-id',
      name: "Blanton's Original",
      distillery: 'Buffalo Trace',
      proof: 107,
      type: 'single_barrel',
      age_statement: null,
      mashbill: null,
      msrp: null,
      description: null,
      city: 'Frankfort',
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

jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: {
      id: 'admin-user-id',
      username: 'admin',
      display_name: 'Admin User',
      avatar_url: null,
      is_admin: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/lib/bourbons', () => ({
  buildBourbonUpdatePayload: jest.fn((_updatedBy: string, fields: Record<string, unknown>) => ({
    ...fields,
    updated_by: _updatedBy,
  })),
  BOURBON_TYPES: [
    { label: 'Traditional', value: 'traditional' },
    { label: 'Small Batch', value: 'small_batch' },
    { label: 'Single Barrel', value: 'single_barrel' },
  ],
}));

jest.mock('@/lib/location-data', () => ({
  WHISKEY_COUNTRIES: [
    { label: 'United States', value: 'US' },
    { label: 'Scotland', value: 'SC' },
  ],
  getProvincesForCountry: () => null,
}));

jest.mock('react-native-element-dropdown', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Dropdown: ({ value, testID }: { data: unknown[]; value: string | null; onChange: (item: unknown) => void; placeholder: string; testID?: string }) => (
      <View testID={testID}>
        <Text testID={`${testID}-selected`}>{value ?? ''}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/SearchablePicker', () => {
  const { View, Text } = require('react-native');
  return {
    SearchablePicker: ({ value, testID }: { value: string; testID?: string }) => (
      <View testID={testID ?? 'searchable-picker'}>
        <Text>{value}</Text>
      </View>
    ),
  };
});

jest.mock('@/hooks/use-distilleries', () => ({
  useDistilleries: () => ({ distilleries: [], isLoading: false }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EditBourbonScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Slice 1 — core wiring: screen renders with heading
  it('renders the Edit Bourbon heading', () => {
    render(<EditBourbonScreen />);
    expect(screen.getByText('Edit Bourbon')).toBeTruthy();
  });

  // Slice 2 — pre-filled: proof input shows current bourbon proof
  it('pre-fills the proof field with the bourbon current proof value', () => {
    render(<EditBourbonScreen />);
    expect(screen.getByDisplayValue('107')).toBeTruthy();
  });

  // Slice 3 — pre-filled: name input shows current bourbon name
  it("pre-fills the name field with the bourbon's current name", () => {
    render(<EditBourbonScreen />);
    expect(screen.getByDisplayValue("Blanton's Original")).toBeTruthy();
  });
});
