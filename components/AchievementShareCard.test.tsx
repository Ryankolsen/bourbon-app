import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementShareCard } from './AchievementShareCard';
import { BELTS } from '@/lib/belt-config';

describe('AchievementShareCard wordmark', () => {
  it('renders Bourbon Dojo and not BourbonVault', () => {
    const { getByText, queryByText } = render(<AchievementShareCard belt={BELTS[0]} />);
    expect(getByText('Bourbon Dojo')).toBeTruthy();
    expect(queryByText('BourbonVault')).toBeNull();
  });
});
