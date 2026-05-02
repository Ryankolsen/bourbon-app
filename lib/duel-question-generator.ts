/**
 * DuelQuestionGenerator — builds a typed 3-round question set for a Dojo Duel session.
 *
 * Pure data-fetching function: no UI, no side effects.
 * Callers pass their own supabase client so this is fully testable in isolation.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Difficulty = 'training' | 'standard' | 'challenge';

export interface IdentificationRound {
  type: 'identification';
  bourbonId: string;
  bourbonName: string;
  /** The correct bourbon name. */
  correctAnswer: string;
  /** 4 shuffled bourbon names including the correct answer. */
  choices: string[];
}

export interface StatBattleRound {
  type: 'stat_battle';
  statType: 'proof' | 'age' | 'mashbill';
  question: string;
  correctAnswer: string;
  /** Up to 4 shuffled answer strings including the correct answer. */
  choices: string[];
}

export interface FakeNoteRound {
  type: 'fake_note';
  bourbonId: string;
  /** Exactly 3 shuffled notes: 2 real, 1 fake. */
  notes: { text: string; isFake: boolean }[];
}

export interface DuelQuestionSet {
  rounds: [IdentificationRound, StatBattleRound, FakeNoteRound];
  difficulty: Difficulty;
  beltLevel: number;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type BourbonRow = Database['public']['Tables']['bourbons']['Row'];
type TastingRow = Database['public']['Tables']['tastings']['Row'];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POOL_SIZE = 30;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function difficultyToTier(difficulty: Difficulty): 1 | 2 | 3 {
  if (difficulty === 'training') return 1;
  if (difficulty === 'standard') return 2;
  return 3;
}

/** Fisher-Yates in-place shuffle; returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Round builders
// ---------------------------------------------------------------------------

function buildIdentificationRound(
  target: BourbonRow,
  pool: BourbonRow[],
): IdentificationRound {
  const otherBourbons = pool.filter((b) => b.id !== target.id);

  // Primary: same type, proof within ±20
  const proofCenter = target.proof ?? 0;
  let distractors = otherBourbons.filter(
    (b) =>
      b.type === target.type &&
      b.proof !== null &&
      b.proof >= proofCenter - 20 &&
      b.proof <= proofCenter + 20,
  );

  // Fallback 1: same type, any proof
  if (distractors.length < 3) {
    distractors = otherBourbons.filter((b) => b.type === target.type);
  }

  // Fallback 2: any bourbon
  if (distractors.length < 3) {
    distractors = otherBourbons;
  }

  const chosen = shuffle(distractors).slice(0, 3);
  const choices = shuffle([target.name, ...chosen.map((b) => b.name)]);

  return {
    type: 'identification',
    bourbonId: target.id,
    bourbonName: target.name,
    correctAnswer: target.name,
    choices,
  };
}

function buildStatBattleRound(
  target: BourbonRow,
  pool: BourbonRow[],
): StatBattleRound {
  // Prefer stats the target bourbon actually has
  const candidates: Array<'proof' | 'age' | 'mashbill'> = [];
  if (target.proof !== null) candidates.push('proof');
  if (target.age_statement !== null) candidates.push('age');
  if (target.mashbill !== null) candidates.push('mashbill');

  const statType: 'proof' | 'age' | 'mashbill' =
    candidates.length > 0 ? pickRandom(candidates) : 'proof';

  const others = pool.filter((b) => b.id !== target.id);

  if (statType === 'proof') {
    const correct = String(target.proof ?? 0);
    const wrongs = [
      ...new Set(
        others.filter((b) => b.proof !== null).map((b) => String(b.proof)),
      ),
    ].filter((v) => v !== correct);

    return {
      type: 'stat_battle',
      statType: 'proof',
      question: `What is the proof of ${target.name}?`,
      correctAnswer: correct,
      choices: shuffle([correct, ...shuffle(wrongs).slice(0, 3)]),
    };
  }

  if (statType === 'age') {
    const correct = `${target.age_statement} year`;
    const wrongs = [
      ...new Set(
        others
          .filter((b) => b.age_statement !== null)
          .map((b) => `${b.age_statement} year`),
      ),
    ].filter((v) => v !== correct);

    return {
      type: 'stat_battle',
      statType: 'age',
      question: `How old is ${target.name}?`,
      correctAnswer: correct,
      choices: shuffle([correct, ...shuffle(wrongs).slice(0, 3)]),
    };
  }

  // mashbill
  const correct = target.mashbill ?? 'unknown';
  const wrongs = [
    ...new Set(
      others
        .filter((b) => b.mashbill !== null)
        .map((b) => b.mashbill as string),
    ),
  ].filter((v) => v !== correct);

  return {
    type: 'stat_battle',
    statType: 'mashbill',
    question: `What type of mash bill does ${target.name} use?`,
    correctAnswer: correct,
    choices: shuffle([correct, ...shuffle(wrongs).slice(0, 3)]),
  };
}

function buildFakeNoteRound(
  pool: BourbonRow[],
  tastingsByBourbonId: Map<string, TastingRow[]>,
  fakeNotes: Array<{ id: string; note: string }>,
): FakeNoteRound {
  // Find a bourbon with ≥2 tastings that include note text
  const withNotes = pool.filter((b) => {
    const ts = tastingsByBourbonId.get(b.id) ?? [];
    return ts.filter((t) => t.nose || t.palate || t.finish).length >= 2;
  });

  // Fallback: any bourbon with ≥1 tasting
  const candidates =
    withNotes.length > 0
      ? withNotes
      : pool.filter((b) => (tastingsByBourbonId.get(b.id)?.length ?? 0) >= 1);

  // Last resort: use the first bourbon in the pool
  const noteBourbon = candidates.length > 0 ? pickRandom(candidates) : pool[0];

  const tastings = tastingsByBourbonId.get(noteBourbon.id) ?? [];
  const notedTastings = tastings.filter((t) => t.nose || t.palate || t.finish);

  // Extract the first non-null note field from each tasting
  const realNoteTexts = shuffle(notedTastings)
    .slice(0, 2)
    .map((t) => ([t.nose, t.palate, t.finish].find(Boolean) as string));

  // Pad to 2 if we don't have enough
  const FALLBACK_REAL_NOTE =
    'Rich caramel sweetness with notes of vanilla and toasted oak, long warm finish.';
  while (realNoteTexts.length < 2) {
    realNoteTexts.push(FALLBACK_REAL_NOTE);
  }

  if (fakeNotes.length === 0) {
    console.warn('[DuelQuestionGenerator] No fake notes found for this difficulty tier');
  }

  const fakeNoteText =
    fakeNotes.length > 0
      ? pickRandom(fakeNotes).note
      : 'Smells exactly like a Honda Civic with the windows up in July.';

  const notes = shuffle([
    { text: realNoteTexts[0], isFake: false },
    { text: realNoteTexts[1], isFake: false },
    { text: fakeNoteText, isFake: true },
  ]);

  return {
    type: 'fake_note',
    bourbonId: noteBourbon.id,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a fully typed 3-round question set for one Dojo Duel session.
 *
 * @param beltLevel  Current user belt level (1–10). Used for pool selection.
 * @param difficulty Session difficulty tier.
 * @param supabase   Typed Supabase client (injectable for testing).
 */
export async function generateDuelQuestions(
  beltLevel: number,
  difficulty: Difficulty,
  supabase: SupabaseClient<Database>,
): Promise<DuelQuestionSet> {
  // ── 1. Fetch bourbon pool ─────────────────────────────────────────────────
  const { data: bourbonsData, error: bourbonsError } = await supabase
    .from('bourbons')
    .select('*')
    .order('name')
    .limit(POOL_SIZE);

  if (bourbonsError || !bourbonsData || bourbonsData.length < 4) {
    throw new Error(
      `[DuelQuestionGenerator] Insufficient bourbon data (got ${bourbonsData?.length ?? 0})`,
    );
  }

  const pool: BourbonRow[] = bourbonsData;

  // ── 2. Fetch tastings for the pool (Round 3) ──────────────────────────────
  const bourbonIds = pool.map((b) => b.id);
  const { data: tastingsData } = await supabase
    .from('tastings')
    .select('*')
    .in('bourbon_id', bourbonIds);

  const tastingsByBourbonId = new Map<string, TastingRow[]>();
  for (const row of tastingsData ?? []) {
    const t = row as TastingRow;
    const existing = tastingsByBourbonId.get(t.bourbon_id);
    if (existing) {
      existing.push(t);
    } else {
      tastingsByBourbonId.set(t.bourbon_id, [t]);
    }
  }

  // ── 3. Fetch fake notes for this difficulty tier (Round 3) ────────────────
  const tier = difficultyToTier(difficulty);
  const { data: fakeNotesData } = await supabase
    .from('duel_fake_notes')
    .select('id, note')
    .eq('difficulty_tier', tier)
    .limit(10);

  const fakeNotes = (fakeNotesData ?? []) as Array<{ id: string; note: string }>;

  // ── 4. Build rounds ───────────────────────────────────────────────────────
  const target = pickRandom(pool);
  const round1 = buildIdentificationRound(target, pool);
  const round2 = buildStatBattleRound(target, pool);
  const round3 = buildFakeNoteRound(pool, tastingsByBourbonId, fakeNotes);

  return {
    rounds: [round1, round2, round3],
    difficulty,
    beltLevel,
  };
}
