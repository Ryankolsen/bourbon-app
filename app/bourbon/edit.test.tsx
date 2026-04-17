/**
 * Tests for the Edit Bourbon screen (issue #86 and #88).
 *
 * Verifies:
 * 1. Admin mode: screen renders pre-filled with current bourbon field values
 * 2. User mode: only null/empty fields are rendered as editable inputs
 * 3. User mode: submit payload contains only the fields that were null at load time
 * 4. updated_by is stamped with the current user's ID
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditBourbonScreen from './edit';

// ── Variable-driven mock state ────────────────────────────────────────────────

let mockLocalSearchParams: { id: string; mode?: string } = { id: 'bourbon-test-id' };

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockRouterBack, replace: mockRouterReplace }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'admin-user-id' } }),
}));

const mockUpdateMutate = jest.fn();
let mockBourbonData: {
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
} = {
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
};

jest.mock('@/hooks/use-bourbons', () => ({
  useUpdateBourbon: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useBourbon: () => ({
    data: mockBourbonData,
    isLoading: false,
    isError: false,
  }),
}));

let mockIsAdminEdit = true;
jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: {
      id: 'admin-user-id',
      username: 'admin',
      display_name: 'Admin User',
      avatar_url: null,
      is_admin: mockIsAdminEdit,
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
  const { View, TextInput } = require('react-native');
  return {
    SearchablePicker: ({ value, onChange, testID }: { value: string; onChange: (v: string) => void; testID?: string }) => (
      <View testID={testID ?? 'searchable-picker'}>
        <TextInput
          testID={testID ? `${testID}-input` : 'searchable-picker-input'}
          value={value}
          onChangeText={onChange}
        />
      </View>
    ),
  };
});

jest.mock('@/hooks/use-distilleries', () => ({
  useDistilleries: () => ({ distilleries: [], isLoading: false }),
}));

// ── Admin mode tests ──────────────────────────────────────────────────────────

describe('EditBourbonScreen — admin mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams = { id: 'bourbon-test-id' };
    mockIsAdminEdit = true;
    mockBourbonData = {
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
    };
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

// ── User mode tests ───────────────────────────────────────────────────────────

describe('EditBourbonScreen — user mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams = { id: 'bourbon-test-id', mode: 'user' };
    mockIsAdminEdit = false;
  });

  // Test 1 — core wiring: field locking
  // Bourbon has name='Buffalo Trace' (non-null) and distillery=null.
  // In user mode: distillery input is present; name TextInput is not rendered.
  it('user mode: renders distillery input (null field) but not name input (non-null)', () => {
    mockBourbonData = {
      id: 'bourbon-test-id',
      name: 'Buffalo Trace',
      distillery: null,
      proof: 90,
      type: 'traditional',
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

    render(<EditBourbonScreen />);

    // distillery was null → should be rendered as editable picker
    expect(screen.getByTestId('distillery-picker')).toBeTruthy();

    // name was non-null → should NOT be rendered as an editable TextInput
    expect(screen.queryByDisplayValue('Buffalo Trace')).toBeNull();
  });

  // Test 2 — payload only includes null fields
  it('user mode: submit payload contains only null fields, not non-null fields like name', async () => {
    mockBourbonData = {
      id: 'bourbon-test-id',
      name: 'Buffalo Trace',
      distillery: null,
      proof: 90,
      type: 'traditional',
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

    render(<EditBourbonScreen />);

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    const callFields = mockUpdateMutate.mock.calls[0][0].fields;
    // name was non-null → must NOT be in the submitted fields
    expect(callFields).not.toHaveProperty('name');
    // distillery was null → must be in the submitted fields
    expect(callFields).toHaveProperty('distillery');
  });

  // Test 5 — updated_by stamped
  it('user mode: updated_by is set to the current user ID on submit', async () => {
    mockBourbonData = {
      id: 'bourbon-test-id',
      name: 'Buffalo Trace',
      distillery: null,
      proof: 90,
      type: 'traditional',
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

    render(<EditBourbonScreen />);
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    expect(mockUpdateMutate.mock.calls[0][0].updatedBy).toBe('admin-user-id');
  });
});
