import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementShareCard } from '@/components/AchievementShareCard';
import { BELTS } from '@/lib/belt-config';

describe('AchievementShareCard', () => {
  // 1 — core wiring: renders belt name
  it('renders belt name "White Dog" for belt 1', () => {
    const { getByText } = render(
      <AchievementShareCard belt={BELTS[0]} platform="ios" />,
    );
    expect(getByText('White Dog')).toBeTruthy();
  });

  // 2 — content details: flavor text and iOS App Store URL string appear
  it('renders flavor text and iOS App Store URL for belt 1', () => {
    const { getByText, getByTestId } = render(
      <AchievementShareCard belt={BELTS[0]} platform="ios" />,
    );
    expect(getByText(BELTS[0].flavor)).toBeTruthy();
    expect(getByTestId('app-store-url')).toBeTruthy();
  });

  // 3 — edge case: Pappy legendary treatment has "legendary-border" testID
  it('renders legendary-border testID for Pappy (belt 10)', () => {
    const { getByTestId } = render(
      <AchievementShareCard belt={BELTS[9]} platform="ios" />,
    );
    expect(getByTestId('legendary-border')).toBeTruthy();
  });

  // 4 — belt 1 does NOT have legendary-border
  it('does not render legendary-border for belt 1', () => {
    const { queryByTestId } = render(
      <AchievementShareCard belt={BELTS[0]} platform="ios" />,
    );
    expect(queryByTestId('legendary-border')).toBeNull();
  });

  // 5 — android platform renders android URL
  it('renders android platform URL when platform="android"', () => {
    const { getByTestId } = render(
      <AchievementShareCard belt={BELTS[0]} platform="android" />,
    );
    expect(getByTestId('app-store-url')).toBeTruthy();
  });
});
