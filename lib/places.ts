/**
 * Google Places Autocomplete — thin fetch wrapper.
 * Requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in the environment.
 * Returns [] gracefully when the key is absent or the query is too short.
 */

export interface PlacePrediction {
  place_id: string;
  place_name: string;
  place_address: string;
}

type AutocompleteResponse = {
  status: string;
  predictions: Array<{
    place_id: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
    description?: string;
  }>;
};

export const PLACES_API_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

export function hasPlacesApiKey(): boolean {
  return PLACES_API_KEY.length > 0;
}

const MIN_QUERY_LEN = 3;
const MAX_RESULTS = 8;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

export async function searchPlaces(
  input: string,
  apiKey: string = PLACES_API_KEY,
): Promise<PlacePrediction[]> {
  if (!apiKey || input.trim().length < MIN_QUERY_LEN) return [];

  const url = `${BASE_URL}?input=${encodeURIComponent(input.trim())}&types=establishment&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json: AutocompleteResponse = await res.json();
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') return [];
  if (!json.predictions?.length) return [];

  return json.predictions.slice(0, MAX_RESULTS).map((p) => ({
    place_id: p.place_id,
    place_name: p.structured_formatting?.main_text ?? p.description ?? '',
    place_address: p.structured_formatting?.secondary_text ?? '',
  }));
}
