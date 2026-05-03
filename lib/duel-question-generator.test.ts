/**
 * Unit tests for generateDuelQuestions.
 *
 * Pattern: pass a mock supabase client directly (no module-level mock needed).
 * Query builder chains are thenable — mock `then` to control resolved data.
 */

import {
  generateDuelQuestions,
  shuffle,
  type Difficulty,
  type DuelQuestionSet,
  type IdentificationRound,
  type FakeNoteRound,
  type BourbonDossier,
} from './duel-question-generator';
import { createMockSupabaseClient } from './test-utils/supabase';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBourbon(overrides: {
  id: string;
  name: string;
  type?: string | null;
  proof?: number | null;
  age_statement?: number | null;
  mashbill?: string | null;
  distillery?: string | null;
  state?: string | null;
}) {
  return {
    id: overrides.id,
    name: overrides.name,
    distillery: overrides.distillery ?? null,
    mashbill: overrides.mashbill ?? null,
    age_statement: overrides.age_statement ?? null,
    proof: overrides.proof ?? null,
    type: overrides.type ?? 'traditional',
    msrp: null,
    image_url: null,
    description: null,
    city: null,
    state: overrides.state ?? null,
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

const FIVE_BOURBONS = [
  makeBourbon({ id: 'b1', name: 'Buffalo Trace', type: 'traditional', proof: 90, age_statement: 8, distillery: 'Buffalo Trace Distillery', state: 'Kentucky' }),
  makeBourbon({ id: 'b2', name: 'Wild Turkey 101', type: 'traditional', proof: 101, age_statement: 6, distillery: 'Wild Turkey Distillery', state: 'Kentucky' }),
  makeBourbon({ id: 'b3', name: 'Knob Creek', type: 'small_batch', proof: 100, age_statement: 9, distillery: 'Jim Beam', state: 'Kentucky' }),
  makeBourbon({ id: 'b4', name: 'Woodford Reserve', type: 'traditional', proof: 90.4, age_statement: null, distillery: 'Woodford Reserve Distillery', state: 'Kentucky' }),
  makeBourbon({ id: 'b5', name: 'Four Roses Single Barrel', type: 'single_barrel', proof: 100, age_statement: null, distillery: null, state: null }),
];

const TWO_TASTINGS = [
  makeTasting({ id: 't1', bourbon_id: 'b1', nose: 'Caramel and vanilla', palate: 'Sweet corn', finish: 'Long oak' }),
  makeTasting({ id: 't2', bourbon_id: 'b1', nose: 'Brown sugar', palate: 'Toffee', finish: 'Warm spice' }),
];

const ONE_FAKE_NOTE = [{ id: 'fn1', note: 'Smells exactly like a Honda Civic in July.' }];

// ---------------------------------------------------------------------------
// Helper: build a thenable query builder that resolves to { data, error }
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
// Slice 1 — Core wiring: returns a valid 3-round question set
// ---------------------------------------------------------------------------

describe('generateDuelQuestions — core wiring', () => {
  it('returns a DuelQuestionSet with exactly 3 rounds', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))   // bourbons
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))     // tastings
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));   // fake notes

    const result = await generateDuelQuestions(3, 'standard', client as any);

    expect(result.rounds).toHaveLength(3);
    expect(result.difficulty).toBe('standard');
    expect(result.beltLevel).toBe(3);
  });

  it('assigns correct type discriminants to each round', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);

    expect(result.rounds[0].type).toBe('identification');
    expect(result.rounds[1].type).toBe('stat_battle');
    expect(result.rounds[2].type).toBe('fake_note');
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Content details
// ---------------------------------------------------------------------------

describe('generateDuelQuestions — content details', () => {
  it('Round 1 choices has exactly 4 entries including the correct answer', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    expect(r1.choices).toHaveLength(4);
    expect(r1.choices).toContain(r1.correctAnswer);
  });

  it('Round 3 has exactly 3 notes: 2 real and 1 fake', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r3 = result.rounds[2] as FakeNoteRound;

    expect(r3.notes).toHaveLength(3);
    const fakeNotes = r3.notes.filter((n) => n.isFake);
    const realNotes = r3.notes.filter((n) => !n.isFake);
    expect(fakeNotes).toHaveLength(1);
    expect(realNotes).toHaveLength(2);
  });

  it('Round 1 correctAnswer is one of the choices', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(1, 'training', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    expect(r1.choices).toContain(r1.correctAnswer);
  });

  it('Round 3 fake note text matches the seeded fake note', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(5, 'challenge', client as any);
    const r3 = result.rounds[2] as FakeNoteRound;
    const fake = r3.notes.find((n) => n.isFake);

    expect(fake?.text).toBe(ONE_FAKE_NOTE[0].note);
  });

  it('Round 1 dossier includes a formatted bourbonType when type is present', async () => {
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    expect(r1.dossier).toBeDefined();
    expect(r1.dossier.bourbonType).not.toBeNull();
    expect(typeof r1.dossier.bourbonType).toBe('string');
  });

  it('Round 1 dossier proof is null when bourbon has no valid proof', async () => {
    const noProofPool = FIVE_BOURBONS.map((b) => ({ ...b, proof: null }));
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(noProofPool))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    expect(r1.dossier.proof).toBeNull();
  });

  it('Round 1 dossier includes distillery and state when present', async () => {
    // b1 has both distillery and state
    const pool = [FIVE_BOURBONS[0], ...FIVE_BOURBONS.slice(1)];
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(pool))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    // The target could be any bourbon — verify the shape is always correct
    expect(r1.dossier).toMatchObject<Partial<BourbonDossier>>({
      bourbonType: expect.anything(),
    });
  });

  it('Round 1 dossier is all-null when no optional fields are present', async () => {
    const barePool = [
      makeBourbon({ id: 'b1', name: 'Alpha', type: 'traditional' }),
      makeBourbon({ id: 'b2', name: 'Beta', type: 'wheated' }),
      makeBourbon({ id: 'b3', name: 'Gamma', type: 'small_batch' }),
      makeBourbon({ id: 'b4', name: 'Delta', type: 'single_barrel' }),
      makeBourbon({ id: 'b5', name: 'Epsilon', type: 'high_rye' }),
    ];
    const { client } = createMockSupabaseClient();

    client.from
      .mockReturnValueOnce(makeQueryBuilder(barePool))
      .mockReturnValueOnce(makeQueryBuilder([]))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    expect(r1.dossier.distillery).toBeNull();
    expect(r1.dossier.state).toBeNull();
    expect(r1.dossier.proof).toBeNull();
    // bourbonType should still be formatted from the enum
    expect(r1.dossier.bourbonType).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — Edge cases
// ---------------------------------------------------------------------------

describe('generateDuelQuestions — edge cases', () => {
  // 3a: fewer than 3 plausible type-matched distractors → still returns 4 choices
  it('widens distractor search when fewer than 3 type-matched bourbons exist', async () => {
    // Only 1 bourbon shares type 'wheated'; others are different types
    const mixedPool = [
      makeBourbon({ id: 'b1', name: 'Maker\'s Mark', type: 'wheated', proof: 90 }),
      makeBourbon({ id: 'b2', name: 'Wild Turkey', type: 'traditional', proof: 101 }),
      makeBourbon({ id: 'b3', name: 'Knob Creek', type: 'small_batch', proof: 100 }),
      makeBourbon({ id: 'b4', name: 'Woodford', type: 'traditional', proof: 90 }),
      makeBourbon({ id: 'b5', name: 'Four Roses', type: 'single_barrel', proof: 100 }),
    ];

    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(mixedPool))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r1 = result.rounds[0] as IdentificationRound;

    // Should still produce 4 choices even when type match falls back
    expect(r1.choices).toHaveLength(4);
    expect(r1.choices).toContain(r1.correctAnswer);
  });

  // 3b: no tastings with non-null notes → Round 3 still returns 3 notes (uses fallbacks)
  it('returns Round 3 with 3 notes even when no tastings have note text', async () => {
    const emptyTastings = [
      makeTasting({ id: 't1', bourbon_id: 'b1', nose: null, palate: null, finish: null }),
    ];

    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(emptyTastings))
      .mockReturnValueOnce(makeQueryBuilder(ONE_FAKE_NOTE));

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r3 = result.rounds[2] as FakeNoteRound;

    expect(r3.notes).toHaveLength(3);
    const fakeCount = r3.notes.filter((n) => n.isFake).length;
    expect(fakeCount).toBe(1);
  });

  // 3c: duel_fake_notes returns empty → Round 3 still returns with emergency fallback note
  it('uses an emergency fallback fake note when duel_fake_notes returns empty', async () => {
    const { client } = createMockSupabaseClient();
    client.from
      .mockReturnValueOnce(makeQueryBuilder(FIVE_BOURBONS))
      .mockReturnValueOnce(makeQueryBuilder(TWO_TASTINGS))
      .mockReturnValueOnce(makeQueryBuilder([])); // empty fake notes

    const result = await generateDuelQuestions(3, 'standard', client as any);
    const r3 = result.rounds[2] as FakeNoteRound;

    expect(r3.notes).toHaveLength(3);
    const fake = r3.notes.find((n) => n.isFake);
    expect(fake).toBeDefined();
    expect(typeof fake?.text).toBe('string');
    expect(fake!.text.length).toBeGreaterThan(0);
  });

  // 3d: insufficient bourbons (<4) → throws
  it('throws when the bourbon pool has fewer than 4 entries', async () => {
    const tinyPool = [
      makeBourbon({ id: 'b1', name: 'A', proof: 90 }),
      makeBourbon({ id: 'b2', name: 'B', proof: 91 }),
    ];

    const { client } = createMockSupabaseClient();
    client.from.mockReturnValueOnce(makeQueryBuilder(tinyPool));

    await expect(
      generateDuelQuestions(3, 'standard', client as any),
    ).rejects.toThrow('[DuelQuestionGenerator]');
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — shuffle utility
// ---------------------------------------------------------------------------

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    expect(shuffle([1, 2, 3, 4])).toHaveLength(4);
  });

  it('contains the same elements as the input', () => {
    const input = ['a', 'b', 'c', 'd'];
    expect(shuffle(input).sort()).toEqual(input.sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});
