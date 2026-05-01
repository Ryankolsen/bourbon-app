/**
 * Unit tests for AchievementShareSheet component.
 *
 * Pattern: mock useShareAchievement at module level so tests stay focused on
 * presentation and dismissal logic, not the underlying share/capture flow.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BELTS } from '@/lib/belt-config';

// ── Mock useShareAchievement ──────────────────────────────────────────────────

const mockShare = jest.fn();
let mockIsSharing = false;
let mockXpAwarded = 0;
let mockAlreadyClaimed = false;
let mockError: Error | null = null;

jest.mock('@/hooks/use-share-achievement', () => ({
  useShareAchievement: jest.fn(() => ({
    cardRef: { current: null },
    share: mockShare,
    isSharing: mockIsSharing,
    xpAwarded: mockXpAwarded,
    alreadyClaimed: mockAlreadyClaimed,
    error: mockError,
  })),
}));

// ── Mock AchievementShareCard (avoid snapshot rendering complexity) ───────────

jest.mock('@/components/AchievementShareCard', () => ({
  AchievementShareCard: () => null,
}));

import { AchievementShareSheet } from '../AchievementShareSheet';

// ── Helpers ───────────────────────────────────────────────────────────────────

const belt = BELTS[4]; // Single Barrel (belt 5)

function renderSheet(overrides: {
  visible?: boolean;
  onClose?: () => void;
  isSharing?: boolean;
} = {}) {
  const { visible = true, onClose = jest.fn(), isSharing } = overrides;

  // Update module-level mock state before render
  if (isSharing !== undefined) mockIsSharing = isSharing;

  return render(
    <AchievementShareSheet visible={visible} belt={belt} onClose={onClose} />,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AchievementShareSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSharing = false;
    mockXpAwarded = 0;
    mockAlreadyClaimed = false;
    mockError = null;
  });

  // 1 — core wiring: all four platform buttons are rendered when visible=true
  it('renders all four platform buttons', () => {
    const { getByText } = renderSheet();

    expect(getByText(/Instagram/i)).toBeTruthy();
    expect(getByText(/Facebook/i)).toBeTruthy();
    expect(getByText(/Bluesky/i)).toBeTruthy();
    expect(getByText(/More/i)).toBeTruthy();
  });

  // 2 — loading state: spinner visible and buttons disabled when isSharing=true
  it('shows a loading indicator and disables buttons when isSharing is true', () => {
    const { getByTestId, getByText } = renderSheet({ isSharing: true });

    expect(getByTestId('share-loading-indicator')).toBeTruthy();

    // The Instagram platform button should be disabled
    const instagramButton = getByTestId('share-platform-instagram');
    expect(instagramButton.props.accessibilityState?.disabled).toBe(true);
  });

  // 3a — dismissal: close button calls onClose without invoking share
  it('calls onClose when close button is tapped, without calling share', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(getByTestId('achievement-share-sheet-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockShare).not.toHaveBeenCalled();
  });

  // 3b — platform tap: Instagram button calls share
  it('calls share when Instagram Stories button is tapped', () => {
    const { getByText } = renderSheet();

    fireEvent.press(getByText(/Instagram/i));

    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  // 3c — platform tap: Facebook button calls share
  it('calls share when Facebook button is tapped', () => {
    const { getByText } = renderSheet();

    fireEvent.press(getByText(/Facebook/i));

    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  // 3d — platform tap: Bluesky button calls share
  it('calls share when Bluesky button is tapped', () => {
    const { getByText } = renderSheet();

    fireEvent.press(getByText(/Bluesky/i));

    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  // 3e — platform tap: More button calls share
  it('calls share when More button is tapped', () => {
    const { getByText } = renderSheet();

    fireEvent.press(getByText(/More/i));

    expect(mockShare).toHaveBeenCalledTimes(1);
  });
});
