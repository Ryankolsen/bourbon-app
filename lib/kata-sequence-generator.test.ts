/**
 * Unit tests for generateKataSequence.
 *
 * Pattern: pass a mock supabase client directly (no module-level mock needed).
 * Query builder chains are thenable — mock `then` to control resolved data.
 */

import {
  generateKataSequence,
  type KataSequenceResult,
} from './kata-sequence-generator';
import { createMockSupabaseClient } from './test-utils/supabase';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBourbon(overrides: {
  id: string;
  name: string;
  type?: string | null;
  proof?: number | null;
}) {
  return {
    id: overrides.id,
    name: overrides.name,
    distillery: null,
    mashbill: null,
    age_statement: null,
    proof: overrides.proof ?? null,
    type: overrides.type ?? 'traditional',
    msrp: null,
    image_url: null,
    description: null,
    city: null,
    state: null,
    country: null,
    submitted_by: null,
    updated_by: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };
}

function makeTasting(overrides: {
  id: string;
  bourbon_id: string;
  nose?: string | null;
  palate?: string | null;
  finish?: string | null;
}) {
  return {
    id: overrides.id,
    user_id: 'user-1',
    bourbon_id: overrides.bourbon_id,
    collection_id: null,
    rating: null,
    nose: overrides.nose ?? null,
    palate: overrides.palate ?? null,
    finish: overrides.finish ?? null,
    overall_notes: null,
    tasted_at: '2024-01-01',
    created_at: '2024-01-01',
  };
}

// Target bourbon has 7 unique descriptors — enough for any difficulty
const TARGET_BOURBON = makeBourbon({ id: 'b1', name: 'Buffalo Trace', type: 'traditional', proof: 90 });
const TARGET_TASTING = makeTasting({
  id: 't1',
  bourbon_id: 'b1',
  nose: 'vanilla, caramel',
  palate: 'rye spice, oak',
  finish: 'long, warm, dry',
});

const DISTRACTOR_BOURBONS = [
  makeBourbon({ id: 'b2', name: 'Wild Turkey 101', type: 'traditional', proof: 101 }),
  makeBourbon({ id: 'b3', name: 'Knob Creek', type: 'small_batch', proof: 100 }),
  makeBourbon({ id: 'b4', name: 'Woodford Reserve', type: 'traditional', proof: 90 }),
];

// Distractor tastings intentionally have ≤3 unique descriptors so they cannot
// be chosen as the target for standard (needs 5) or challenge (needs 7).
const DISTRACTOR_TASTINGS = [
  makeTasting({ id: 't2', bourbon_id: 'b2', nose: 'honey, leather', palate: null, finish: null }),
  makeTasting({ id: 't3', bourbon_id: 'b3', nose: 'cherry, mint', palate: null, finish: null }),
  makeTasting({ id: 't4', bourbon_id: 'b4', nose: 'floral, citrus', palate: null, finish: null }),
];

const ALL_BOURBONS = [TARGET_BOURBON, ...DISTRACTOR_BOURBONS];
const ALL_TASTINGS = [TARGET_TASTING, ...DISTRACTOR_TASTINGS];

// ---------------------------------------------------------------------------
// Helper: build a thenable query builder
// ---------------------------------------------------------------------------

function makeQueryBuilder(data: unknown[], error: null | { message: string } = null) {
  const methods = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'not', 'is', 'ilike', 'or'];
  const qb: Record<string, jest.Mock> = {};
  for (const m of methods) {
    qb[m] = jest.fn().mockReturnThis();
  }
  qb['then'] = jest.fn((resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve),
  );
  return qb;
}

// ---------------------------------------------------------------------------
// Slice 1 — Core wiring
// ---------------------------------------------------------------------------

describe('generateKataSequence — core wiring', () => {
  it('returns a sequence of length 5 for standard difficulty', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(ALL_BOURBONS))   // bourbons
      .mockReturnValueOnce(makeQueryBuilder(ALL_TASTINGS));   // tastings

    const result: KataSequenceResult = await generateKataSequence(3, 'standard', client as any);

    expect(result.sequence).toHaveLength(5);
    expect(result.bourbon.id).toBe(TARGET_BOURBON.id);
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Content details
// ---------------------------------------------------------------------------

describe('generateKataSequence — content details', () => {
  it('every item in sequence is a trimmed non-empty string', async () => {
    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(ALL_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(ALL_TASTINGS));

    const result = await generateKataSequence(3, 'standard', client as any);

    for (const item of result.sequence) {
      expect(typeof item).toBe('string');
      expect(item.trim()).toBe(item);
      expect(item.length).toBeGreaterThan(0);
    }
  });

  it('no item appears in both sequence and distractors', async () => {
    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(ALL_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(ALL_TASTINGS));

    const result = await generateKataSequence(3, 'standard', client as any);

    const sequenceSet = new Set(result.sequence);
    for (const d of result.distractors) {
      expect(sequenceSet.has(d)).toBe(false);
    }
  });

  it('cards contains all sequence items', async () => {
    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(ALL_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(ALL_TASTINGS));

    const result = await generateKataSequence(3, 'standard', client as any);

    for (const item of result.sequence) {
      expect(result.cards).toContain(item);
    }
  });

  it('training difficulty returns sequence of length 3', async () => {
    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(ALL_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(ALL_TASTINGS));

    const result = await generateKataSequence(1, 'training', client as any);

    expect(result.sequence).toHaveLength(3);
  });

  it('challenge difficulty returns sequence of length 7', async () => {
    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(ALL_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(ALL_TASTINGS));

    const result = await generateKataSequence(5, 'challenge', client as any);

    expect(result.sequence).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — Edge cases
// ---------------------------------------------------------------------------

describe('generateKataSequence — edge cases', () => {
  it('tries another bourbon when selected one has fewer descriptors than sequence length', async () => {
    // b1 has only 4 unique descriptors; b2 has 6 — challenge needs 7, but b2+b3 together
    // can fulfill it from tasting records. The generator should fall back to the
    // bourbon with the most descriptors.
    const thinBourbon = makeBourbon({ id: 'b1', name: 'Thin Bourbon', type: 'traditional' });
    const richBourbon = makeBourbon({ id: 'b2', name: 'Rich Bourbon', type: 'traditional' });
    const otherBourbons = [
      makeBourbon({ id: 'b3', name: 'Other A', type: 'traditional' }),
      makeBourbon({ id: 'b4', name: 'Other B', type: 'traditional' }),
    ];

    // thinBourbon: only 4 unique descriptors
    const thinTasting = makeTasting({
      id: 't1', bourbon_id: 'b1',
      nose: 'vanilla, caramel',
      palate: 'oak, spice',
      finish: null,
    });
    // richBourbon: 7 unique descriptors
    const richTasting = makeTasting({
      id: 't2', bourbon_id: 'b2',
      nose: 'vanilla, caramel, honey',
      palate: 'oak, spice, leather',
      finish: 'long, smoke, pepper, cherry',
    });
    const otherTastingA = makeTasting({
      id: 't3', bourbon_id: 'b3',
      nose: 'floral, citrus',
      palate: 'mint, grain',
      finish: 'nutmeg',
    });
    const otherTastingB = makeTasting({
      id: 't4', bourbon_id: 'b4',
      nose: 'cherry, plum',
      palate: 'chocolate, toffee',
      finish: 'cinnamon',
    });

    const { client } = createMockSupabaseClient();

    // Put thinBourbon first so it's selected first in shuffle... but since shuffle
    // is random, we mock shuffle by ensuring richBourbon has enough descriptors.
    // The generator should end up using richBourbon for challenge.
    client.from
      .mockReturnValueOnce(makeQueryBuilder([thinBourbon, richBourbon, ...otherBourbons]))
      .mockReturnValueOnce(makeQueryBuilder([thinTasting, richTasting, otherTastingA, otherTastingB]));

    const result = await generateKataSequence(5, 'challenge', client as any);

    // Should succeed and return sequence of 7
    expect(result.sequence).toHaveLength(7);
  });

  it('widens distractor pool to any type when same-type distractors return 0', async () => {
    // Only b1 is type 'wheated'; all others are 'traditional'
    const wheatedTarget = makeBourbon({ id: 'b1', name: "Maker's Mark", type: 'wheated' });
    const traditionals = [
      makeBourbon({ id: 'b2', name: 'Wild Turkey', type: 'traditional' }),
      makeBourbon({ id: 'b3', name: 'Knob Creek', type: 'traditional' }),
      makeBourbon({ id: 'b4', name: 'Woodford', type: 'traditional' }),
    ];

    const targetTasting = makeTasting({
      id: 't1', bourbon_id: 'b1',
      nose: 'vanilla, caramel',
      palate: 'wheat, soft',
      finish: 'light, sweet',
    });
    const distTasting2 = makeTasting({ id: 't2', bourbon_id: 'b2', nose: 'honey, corn', palate: 'oak', finish: 'smoke' });
    const distTasting3 = makeTasting({ id: 't3', bourbon_id: 'b3', nose: 'cherry', palate: 'spice', finish: 'pepper' });
    const distTasting4 = makeTasting({ id: 't4', bourbon_id: 'b4', nose: 'citrus', palate: 'mint', finish: 'grain' });

    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder([wheatedTarget, ...traditionals]))
      .mockReturnValueOnce(makeQueryBuilder([targetTasting, distTasting2, distTasting3, distTasting4]));

    // Should not throw even though no same-type distractors exist
    const result = await generateKataSequence(3, 'training', client as any);

    expect(result.sequence).toHaveLength(3);
    // Cards should have all sequence items (distractor widening worked)
    for (const item of result.sequence) {
      expect(result.cards).toContain(item);
    }
  });

  it('skips bourbon with all-null tasting fields and tries next candidate', async () => {
    const nullNotesBourbon = makeBourbon({ id: 'b1', name: 'Null Bourbon', type: 'traditional' });
    const goodBourbon = makeBourbon({ id: 'b2', name: 'Good Bourbon', type: 'traditional' });
    const distractors = [
      makeBourbon({ id: 'b3', name: 'Dist A', type: 'traditional' }),
      makeBourbon({ id: 'b4', name: 'Dist B', type: 'traditional' }),
    ];

    const nullTasting = makeTasting({ id: 't1', bourbon_id: 'b1', nose: null, palate: null, finish: null });
    const goodTasting = makeTasting({
      id: 't2', bourbon_id: 'b2',
      nose: 'vanilla, caramel, honey',
      palate: 'oak, spice',
      finish: null,
    });
    const distTasting3 = makeTasting({ id: 't3', bourbon_id: 'b3', nose: 'cherry, plum', palate: 'smoke', finish: 'grain' });
    const distTasting4 = makeTasting({ id: 't4', bourbon_id: 'b4', nose: 'citrus, floral', palate: 'pepper', finish: 'mint' });

    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder([nullNotesBourbon, goodBourbon, ...distractors]))
      .mockReturnValueOnce(makeQueryBuilder([nullTasting, goodTasting, distTasting3, distTasting4]));

    const result = await generateKataSequence(1, 'training', client as any);

    // nullNotesBourbon should be skipped; result.bourbon should be the one with notes
    expect(result.bourbon.id).not.toBe('b1');
    expect(result.sequence).toHaveLength(3);
  });
});
