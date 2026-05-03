/**
 * Tests for the Edit Bourbon screen (issue #180).
 *
 * Verifies:
 * 1. Admin mode: screen renders pre-filled with current bourbon field values
 * 2. Community mode: Tier 1 path (blank field → useUpdateBourbon)
 * 3. Community mode: Tier 2 path (existing value → useSubmitBourbonSuggestion)
 * 4. Community mode: image URL field is absent
 * 5. Community mode: proof=0 treated as blank (Tier 1)
 * 6. Community mode: single submit handles both Tier 1 and Tier 2 changes
 * 7. Community mode: no changes → neither hook is called
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditBourbonScreen from './edit';

// ── Variable-driven mock state ────────────────────────────────────────────────

let mockLocalSearchParams: { id: string } = { id: 'bourbon-test-id' };

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockRouterBack, replace: mockRouterReplace }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-id-abc' } }),
}));

const mockUpdateMutate = jest.fn();
const mockUpdateMutateAsync = jest.fn().mockResolvedValue({
  id: 'bourbon-test-id',
  name: "Blanton's Original",
});

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
  useUpdateBourbon: () => ({
    mutate: mockUpdateMutate,
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useBourbon: () => ({
    data: mockBourbonData,
    isLoading: false,
    isError: false,
  }),
}));

const mockSuggestionMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/use-bourbon-suggestions', () => ({
  useSubmitBourbonSuggestion: () => ({
    mutateAsync: mockSuggestionMutateAsync,
    isPending: false,
  }),
}));

let mockIsAdminEdit = true;
jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: {
      id: 'user-id-abc',
      username: 'testuser',
      display_name: 'Test User',
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
  const { View, Text } = require('react-native');
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
    mockUpdateMutateAsync.mockResolvedValue({ id: 'bourbon-test-id', name: "Blanton's Original" });
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

// ── Community mode tests ──────────────────────────────────────────────────────

describe('EditBourbonScreen — community mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams = { id: 'bourbon-test-id' };
    mockIsAdminEdit = false;
    mockUpdateMutateAsync.mockResolvedValue({ id: 'bourbon-test-id', name: "Blanton's Original" });
    mockSuggestionMutateAsync.mockResolvedValue(undefined);
  });

  // Test 1 — Tier 1 path: proof was null, user submits a new value
  it('Tier 1: calls useUpdateBourbon when submitting a value for a null (blank) field', async () => {
    mockBourbonData = {
      ...mockBourbonData,
      proof: null,
    };

    render(<EditBourbonScreen />);

    // Proof field should be empty (null → "")
    const proofInput = screen.getByPlaceholderText('e.g. 93');
    expect(proofInput.props.value).toBe('');

    // User enters a new proof value
    fireEvent.changeText(proofInput, '95');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1));

    const call = mockUpdateMutateAsync.mock.calls[0][0];
    expect(call.fields.proof).toBe('95');
    expect(mockSuggestionMutateAsync).not.toHaveBeenCalled();
  });

  // Test 2 — Tier 2 path: proof was 90, user submits 95
  it('Tier 2: calls useSubmitBourbonSuggestion when changing an existing (non-blank) field', async () => {
    mockBourbonData = {
      ...mockBourbonData,
      proof: 90,
    };

    render(<EditBourbonScreen />);

    const proofInput = screen.getByPlaceholderText('e.g. 93');
    expect(proofInput.props.value).toBe('90');

    fireEvent.changeText(proofInput, '95');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockSuggestionMutateAsync).toHaveBeenCalledTimes(1));

    const call = mockSuggestionMutateAsync.mock.calls[0][0];
    expect(call.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldName: 'proof', oldValue: '90', newValue: '95' }),
      ])
    );
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  // Test 3 — Image URL field is not present in community form
  it('does not render the image URL field for community users', () => {
    render(<EditBourbonScreen />);
    expect(screen.queryByTestId('image-url-input')).toBeNull();
  });

  // Test 4 — proof=0 is treated as blank (Tier 1, not Tier 2)
  it('Tier 1: proof=0 is treated as blank and routes to useUpdateBourbon', async () => {
    mockBourbonData = {
      ...mockBourbonData,
      proof: 0,
    };

    render(<EditBourbonScreen />);

    const proofInput = screen.getByPlaceholderText('e.g. 93');
    // Form shows "0" as the current value
    expect(proofInput.props.value).toBe('0');

    fireEvent.changeText(proofInput, '95');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1));

    const call = mockUpdateMutateAsync.mock.calls[0][0];
    expect(call.fields.proof).toBe('95');
    expect(mockSuggestionMutateAsync).not.toHaveBeenCalled();
  });

  // Test 5 — Both Tier 1 and Tier 2 changes in the same submit
  it('dispatches both Tier 1 and Tier 2 in a single submit when both types of changes are present', async () => {
    mockBourbonData = {
      ...mockBourbonData,
      proof: null,           // blank → Tier 1 when filled
      distillery: 'Buffalo Trace',  // non-blank → Tier 2 when changed
    };

    render(<EditBourbonScreen />);

    // Change proof (Tier 1: was null)
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 93'), '95');

    // Change distillery (Tier 2: was "Buffalo Trace")
    fireEvent.changeText(screen.getByTestId('distillery-picker-input'), 'Four Roses');

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockSuggestionMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  // Test 6 — No changes: neither hook is called
  it('does not call either hook when user submits with no changes', async () => {
    mockBourbonData = {
      ...mockBourbonData,
      proof: 90,
      distillery: 'Buffalo Trace',
    };

    render(<EditBourbonScreen />);

    // Submit without changing anything (all form values match bourbon values)
    fireEvent.press(screen.getByText('Save Changes'));

    // Allow any async work to settle
    await waitFor(() => {});

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(mockSuggestionMutateAsync).not.toHaveBeenCalled();
  });
});
