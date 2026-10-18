import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementShareCard } from '@/components/AchievementShareCard';
import { BELTS } from '@/lib/belt-config';
import { LANDING_PAGE_URL } from '@/lib/public-links';
import { blendTowardBlack, contrastRatio } from '@/lib/contrast';

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

  // 6 — scrim only for white-text belts
  it('renders the scrim for a white-text belt (belt 5) but not for belt 1', () => {
    const dark = render(<AchievementShareCard belt={BELTS[4]} />);
    expect(dark.getByTestId('share-scrim')).toBeTruthy();
    const light = render(<AchievementShareCard belt={BELTS[0]} />);
    expect(light.queryByTestId('share-scrim')).toBeNull();
  });

  // 7 — contrast: effective text vs effective background >= 4.5 for every belt
  it.each(BELTS.map((b) => [b.level, b.name, b] as const))(
    'belt %i (%s) text contrast is >= 4.5:1',
    (_level, _name, belt) => {
      const hasScrim = belt.shareTextColor === undefined;
      const text = belt.shareTextColor ?? belt.iconColor;
      const bg = hasScrim ? blendTowardBlack(belt.bgColor, 0.4) : belt.bgColor;
      expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
    },
  );

  // 8 — no opacity on text, fixed font scaling
  it('uses no text opacity and disables font scaling on every Text', () => {
    const { UNSAFE_getAllByType } = render(<AchievementShareCard belt={BELTS[4]} />);
    const { Text } = require('react-native');
    for (const t of UNSAFE_getAllByType(Text)) {
      expect(t.props.allowFontScaling).toBe(false);
      const flat = ([] as object[]).concat(...[t.props.style].flat(5).filter(Boolean)) as { opacity?: number }[];
      expect(flat.some((st) => st.opacity !== undefined)).toBe(false);
    }
  });

  // 9 — filled circle icon for White Dog and Pappy
  it('renders the filled icon circle for belts 1 and 10 only', () => {
    expect(render(<AchievementShareCard belt={BELTS[0]} />).getByTestId('share-icon-circle')).toBeTruthy();
    expect(render(<AchievementShareCard belt={BELTS[9]} />).getByTestId('share-icon-circle')).toBeTruthy();
    expect(render(<AchievementShareCard belt={BELTS[2]} />).queryByTestId('share-icon-circle')).toBeNull();
  });
});
