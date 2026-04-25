/**
 * Unit tests for lib/places.ts
 *
 * Slices:
 *   1 — Returns [] for inputs shorter than 3 chars
 *   2 — Returns [] when no API key provided
 *   3 — Maps a valid API response to PlacePrediction[]
 *   4 — Returns [] on non-OK HTTP status
 *   5 — Returns [] on ZERO_RESULTS status body
 */

import { searchPlaces } from './places';

const FAKE_KEY = 'test-api-key-123';

function mockFetchOk(body: object) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  }) as jest.Mock;
}

const VALID_RESPONSE = {
  status: 'OK',
  predictions: [
    {
      place_id: 'ChIJabc123',
      structured_formatting: {
        main_text: 'Total Wine & More',
        secondary_text: 'Louisville, KY, USA',
      },
      description: 'Total Wine & More, Louisville, KY, USA',
    },
    {
      place_id: 'ChIJxyz789',
      structured_formatting: {
        main_text: "Party Mart",
        secondary_text: 'Lexington, KY, USA',
      },
      description: "Party Mart, Lexington, KY, USA",
    },
  ],
};

// ── Slice 1: short input ──────────────────────────────────────────────────────

test('returns [] for input shorter than 3 chars', async () => {
  global.fetch = jest.fn() as jest.Mock;
  expect(await searchPlaces('ab', FAKE_KEY)).toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── Slice 2: no API key ───────────────────────────────────────────────────────

test('returns [] when apiKey is empty string', async () => {
  global.fetch = jest.fn() as jest.Mock;
  expect(await searchPlaces('Total Wine', '')).toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── Slice 3: maps valid response ──────────────────────────────────────────────

test('maps valid API response to PlacePrediction[]', async () => {
  mockFetchOk(VALID_RESPONSE);
  const results = await searchPlaces('Total Wine', FAKE_KEY);
  expect(results).toHaveLength(2);
  expect(results[0]).toEqual({
    place_id: 'ChIJabc123',
    place_name: 'Total Wine & More',
    place_address: 'Louisville, KY, USA',
  });
  expect(results[1]).toEqual({
    place_id: 'ChIJxyz789',
    place_name: 'Party Mart',
    place_address: 'Lexington, KY, USA',
  });
});

// ── Slice 4: non-OK HTTP status ───────────────────────────────────────────────

test('returns [] when HTTP response is not ok', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  const results = await searchPlaces('Total Wine', FAKE_KEY);
  expect(results).toEqual([]);
});

// ── Slice 5: ZERO_RESULTS body ────────────────────────────────────────────────

test('returns [] when Places API returns ZERO_RESULTS', async () => {
  mockFetchOk({ status: 'ZERO_RESULTS', predictions: [] });
  const results = await searchPlaces('xyzzy bourbon store', FAKE_KEY);
  expect(results).toEqual([]);
});
