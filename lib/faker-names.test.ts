import {
  TRAINING_FAKES,
  STANDARD_FAKES,
  CHALLENGE_FAKES,
  getFakesForDifficulty,
} from './faker-names';

it('exports three non-empty arrays', () => {
  expect(TRAINING_FAKES.length).toBeGreaterThanOrEqual(50);
  expect(STANDARD_FAKES.length).toBeGreaterThanOrEqual(50);
  expect(CHALLENGE_FAKES.length).toBeGreaterThanOrEqual(50);
});

it('getFakesForDifficulty returns the correct tier', () => {
  expect(getFakesForDifficulty('training')).toBe(TRAINING_FAKES);
  expect(getFakesForDifficulty('standard')).toBe(STANDARD_FAKES);
  expect(getFakesForDifficulty('challenge')).toBe(CHALLENGE_FAKES);
});

it.each([
  ['training', TRAINING_FAKES],
  ['standard', STANDARD_FAKES],
  ['challenge', CHALLENGE_FAKES],
] as const)('%s tier has no duplicate names', (_tier, names) => {
  expect(new Set(names).size).toBe(names.length);
});
