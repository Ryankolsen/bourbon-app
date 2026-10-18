import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementShareCard } from '@/components/AchievementShareCard';
import { BELTS } from '@/lib/belt-config';
import { LANDING_PAGE_URL } from '@/lib/public-links';

describe('AchievementShareCard', () => {
  // 1 — core wiring: renders belt name
  it('renders belt name "White Dog" for belt 1', () => {
    const { getByText } = render(<AchievementShareCard belt={BELTS[0]} />);
    expect(getByText('White Dog')).toBeTruthy();
  });

  // 2 — content details: flavor text and landing page URL appear
  it('renders flavor text and the landing page URL for belt 1', () => {
    const { getByText, getByTestId } = render(
      <AchievementShareCard belt={BELTS[0]} />,
    );
    expect(getByText(BELTS[0].flavor)).toBeTruthy();
    expect(getByTestId('landing-url')).toBeTruthy();
    expect(getByText(LANDING_PAGE_URL)).toBeTruthy();
  });

  // 3 — edge case: Pappy legendary treatment has "legendary-border" testID
  it('renders legendary-border testID for Pappy (belt 10)', () => {
    const { getByTestId } = render(<AchievementShareCard belt={BELTS[9]} />);
    expect(getByTestId('legendary-border')).toBeTruthy();
  });

  // 4 — belt 1 does NOT have legendary-border
  it('does not render legendary-border for belt 1', () => {
    const { queryByTestId } = render(<AchievementShareCard belt={BELTS[0]} />);
    expect(queryByTestId('legendary-border')).toBeNull();
  });

  // 5 — wordmark: shows the current brand name
  it('renders the Bourbon Dojo wordmark', () => {
    const { getByText, queryByText } = render(<AchievementShareCard belt={BELTS[0]} />);
    expect(getByText('Bourbon Dojo')).toBeTruthy();
    expect(queryByText('BourbonVault')).toBeNull();
  });
});
