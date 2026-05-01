/**
 * Unit tests for NewTastingScreen — first tasting share prompt.
 *
 * Mocks: useLogTasting, useHasSharedAchievement, AchievementShareSheet,
 * router/useLocalSearchParams from expo-router, useAuth, useBourbon,
 * useSafeAreaInsets, useToast, buildTastingPayload.
 *
 * Tests focus on the share-prompt logic added in #159; other screen behaviour
 * (form fields, loading state) is out of scope here.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { tastingFactory } from '@/lib/test-utils/factories';

// ── expo-router ───────────────────────────────────────────────────────────────

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ bourbonId: 'bourbon-test-id' }),
}));

// ── useAuth ───────────────────────────────────────────────────────────────────

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-test-id' } }),
}));

// ── useBourbon ────────────────────────────────────────────────────────────────

jest.mock('@/hooks/use-bourbons', () => ({
  useBourbon: () => ({
    data: { id: 'bourbon-test-id', name: 'Test Bourbon' },
    isLoading: false,
  }),
}));

// ── useLogTasting ─────────────────────────────────────────────────────────────

const mockMutate = jest.fn();

jest.mock('@/hooks/use-tastings', () => ({
  useLogTasting: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// ── useHasSharedAchievement ───────────────────────────────────────────────────

let mockHasShared = false;

jest.mock('@/hooks/use-has-shared-achievement', () => ({
  useHasSharedAchievement: () => ({
    data: mockHasShared,
    isLoading: false,
  }),
}));

// ── AchievementShareSheet ─────────────────────────────────────────────────────

jest.mock('@/components/AchievementShareSheet', () => ({
  AchievementShareSheet: ({
    visible,
    onClose,
  }: {
    visible: boolean;
    onClose: () => void;
  }) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    if (!visible) return null;
    return (
      <View testID="share-sheet">
        <TouchableOpacity testID="share-sheet-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// ── Misc dependencies ─────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/lib/toast-provider', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/lib/tastings', () => ({
  buildTastingPayload: jest.fn(() => ({})),
}));

// ── Subject under test ────────────────────────────────────────────────────────

import NewTastingScreen from '../new';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate a successful logTasting mutate that immediately calls onSuccess. */
function mockSuccessfulSave() {
  mockMutate.mockImplementation((_payload: unknown, callbacks: { onSuccess: (data: unknown) => void }) => {
    callbacks.onSuccess(tastingFactory());
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NewTastingScreen — first tasting share prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasShared = false;
  });

  // 1 — core wiring: share prompt appears after save when hasShared is false
  it('shows share prompt after first successful tasting save', async () => {
    mockSuccessfulSave();
    const { getByText, findByText } = render(<NewTastingScreen />);

    fireEvent.press(getByText(/Save Tasting/i));

    expect(await findByText(/Share Your First Tasting/i)).toBeTruthy();
  });

  // 2 — content details: tapping Share opens AchievementShareSheet
  it('opens AchievementShareSheet when Share button in the prompt is tapped', async () => {
    mockSuccessfulSave();
    const { getByText, findByText, findByTestId } = render(<NewTastingScreen />);

    fireEvent.press(getByText(/Save Tasting/i));
    await findByText(/Share Your First Tasting/i);
    fireEvent.press(getByText(/^Share$/i));

    expect(await findByTestId('share-sheet')).toBeTruthy();
  });

  // 3a — edge case: hasShared=true → prompt is skipped, router.back() called directly
  it('calls router.back() directly when hasShared is true', async () => {
    mockHasShared = true;
    mockSuccessfulSave();
    const { getByText } = render(<NewTastingScreen />);

    fireEvent.press(getByText(/Save Tasting/i));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // 3b — edge case: tapping Skip calls router.back() without opening the sheet
  it('calls router.back() when Skip is tapped, without opening the share sheet', async () => {
    mockSuccessfulSave();
    const { getByText, findByText, queryByTestId } = render(<NewTastingScreen />);

    fireEvent.press(getByText(/Save Tasting/i));
    await findByText(/Share Your First Tasting/i);
    fireEvent.press(getByText(/Skip/i));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(queryByTestId('share-sheet')).toBeNull();
  });
});
