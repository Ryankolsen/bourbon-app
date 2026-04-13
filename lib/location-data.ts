import { State } from 'country-state-city';

export type LocationOption = { label: string; value: string };

export const WHISKEY_COUNTRIES: LocationOption[] = [
  { label: 'United States', value: 'US' },
  { label: 'Scotland', value: 'GB-SCT' },
  { label: 'Ireland', value: 'IE' },
  { label: 'Japan', value: 'JP' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
  { label: 'Taiwan', value: 'TW' },
  { label: 'India', value: 'IN' },
  { label: 'England', value: 'GB-ENG' },
  { label: 'Wales', value: 'GB-WLS' },
  { label: 'Other', value: 'Other' },
];

// Country codes that map directly to ISO 3166-1 alpha-2 codes used by country-state-city
const ISO_COUNTRY_CODES = new Set(['US', 'IE', 'JP', 'CA', 'AU', 'TW', 'IN']);

export function getProvincesForCountry(countryCode: string): LocationOption[] | null {
  if (countryCode === 'Other' || !ISO_COUNTRY_CODES.has(countryCode)) {
    return null;
  }
  const states = State.getStatesOfCountry(countryCode);
  if (!states || states.length === 0) {
    return null;
  }
  return states.map((s) => ({ label: s.name, value: s.isoCode }));
}
