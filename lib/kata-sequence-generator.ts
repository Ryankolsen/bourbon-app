/**
 * KataSequenceGenerator — builds a Sacred Pour round from bourbon tasting data.
 *
 * Pure data-fetching function: no UI, no side effects.
 * Callers pass their own supabase client so this is fully testable in isolation.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { Difficulty, shuffle } from './duel-question-generator';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type { Difficulty };

type BourbonRow = Database['public']['Tables']['bourbons']['Row'];
type TastingRow = Database['public']['Tables']['tastings']['Row'];

export interface KataSequenceResult {
  /** The bourbon whose tasting descriptors form the sequence. */
  bourbon: BourbonRow;
  /** Ordered target sequence the player must recreate. */
  sequence: string[];
  /** All cards (sequence + distractors) shuffled for the grid. */
  cards: string[];
  /** Distractor phrases from other bourbons (not in sequence). */
  distractors: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POOL_SIZE = 30;
const DISTRACTOR_COUNT = 4;

const SEQUENCE_LENGTHS: Record<Difficulty, number> = {
  training: 3,
  standard: 5,
  challenge: 7,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split a tasting note field into individual trimmed descriptor phrases. */
function parseDescriptors(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Collect all unique descriptor phrases from a bourbon's tasting records. */
function getDescriptorsForBourbon(tastings: TastingRow[]): string[] {
  const all: string[] = [];
  for (const t of tastings) {
    all.push(...parseDescriptors(t.nose));
    all.push(...parseDescriptors(t.palate));
    all.push(...parseDescriptors(t.finish));
  }
  return [...new Set(all)];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a kata sequence for one Sacred Pour session.
 *
 * @param beltLevel  Current user belt level (1–10). Used for pool selection.
 * @param difficulty Session difficulty tier.
 * @param supabase   Typed Supabase client (injectable for testing).
 */
export async function generateKataSequence(
  beltLevel: number,
  difficulty: Difficulty,
  supabase: SupabaseClient<Database>,
): Promise<KataSequenceResult> {
  const sequenceLength = SEQUENCE_LENGTHS[difficulty];

  // ── 1. Fetch bourbon pool ─────────────────────────────────────────────────
  const { data: bourbonsData, error: bourbonsError } = await supabase
    .from('bourbons')
    .select('*')
    .order('name')
    .limit(POOL_SIZE);

  if (bourbonsError || !bourbonsData || bourbonsData.length < 2) {
    throw new Error(
      `[KataSequenceGenerator] Insufficient bourbon data (got ${bourbonsData?.length ?? 0})`,
    );
  }

  const pool: BourbonRow[] = bourbonsData;

  // ── 2. Fetch tastings for the pool ────────────────────────────────────────
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

  // ── 3. Find a bourbon with enough unique descriptors ──────────────────────
  // Shuffle pool so we don't always pick the same bourbon.
  const shuffledPool = shuffle(pool);

  let targetBourbon: BourbonRow | null = null;
  let targetDescriptors: string[] = [];

  for (const candidate of shuffledPool) {
    const tastings = tastingsByBourbonId.get(candidate.id) ?? [];
    const descriptors = getDescriptorsForBourbon(tastings);
    if (descriptors.length >= sequenceLength) {
      targetBourbon = candidate;
      targetDescriptors = descriptors;
      break;
    }
  }

  // Fallback: use the bourbon with the most available descriptors.
  if (!targetBourbon) {
    let bestCount = 0;
    for (const b of shuffledPool) {
      const tastings = tastingsByBourbonId.get(b.id) ?? [];
      const descriptors = getDescriptorsForBourbon(tastings);
      if (descriptors.length > bestCount) {
        bestCount = descriptors.length;
        targetBourbon = b;
        targetDescriptors = descriptors;
      }
    }
  }

  if (!targetBourbon || targetDescriptors.length === 0) {
    throw new Error('[KataSequenceGenerator] No bourbon found with tasting descriptors');
  }

  // ── 4. Select sequence from target's descriptors ──────────────────────────
  const sequence = shuffle(targetDescriptors).slice(0, sequenceLength);
  const sequenceSet = new Set(sequence);

  // ── 5. Collect distractors from other bourbons ────────────────────────────
  // Primary source: same type; fallback: any other bourbon.
  const sameTypeOthers = pool.filter(
    (b) => b.id !== targetBourbon!.id && b.type === targetBourbon!.type,
  );
  const allOthers = pool.filter((b) => b.id !== targetBourbon!.id);
  const distractorSources = sameTypeOthers.length > 0 ? sameTypeOthers : allOthers;

  const distractors: string[] = [];
  for (const b of shuffle(distractorSources)) {
    const tastings = tastingsByBourbonId.get(b.id) ?? [];
    const descriptors = getDescriptorsForBourbon(tastings);
    for (const d of shuffle(descriptors)) {
      if (!sequenceSet.has(d) && !distractors.includes(d)) {
        distractors.push(d);
        if (distractors.length >= DISTRACTOR_COUNT) break;
      }
    }
    if (distractors.length >= DISTRACTOR_COUNT) break;
  }

  // ── 6. Build shuffled card grid ───────────────────────────────────────────
  const cards = shuffle([...sequence, ...distractors]);

  return {
    bourbon: targetBourbon,
    sequence,
    cards,
    distractors,
  };
}
