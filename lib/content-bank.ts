import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export type SenseiOutcome =
  | 'duel_win'
  | 'duel_loss'
  | 'duel_sweep'
  | 'pour_perfect'
  | 'pour_partial'
  | 'pour_fail';

type FakeNoteRow = Database['public']['Tables']['duel_fake_notes']['Row'];
type SenseiQuoteRow = Database['public']['Tables']['sensei_quotes']['Row'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fetch a random fake tasting note for the given difficulty tier.
 * Returns null if none exist or on any DB error.
 */
export async function fetchFakeNote(
  difficultyTier: 1 | 2 | 3,
  supabase: SupabaseClient<Database>,
): Promise<FakeNoteRow | null> {
  try {
    const { data, error } = await supabase
      .from('duel_fake_notes')
      .select('*')
      .eq('difficulty_tier', difficultyTier)
      .limit(50);

    if (error || !data || data.length === 0) return null;
    return pickRandom(data as FakeNoteRow[]);
  } catch {
    return null;
  }
}

/**
 * Fetch a random Sensei quote for the given game outcome.
 * Returns null if none exist or on any DB error.
 */
export async function fetchSenseiQuote(
  outcome: SenseiOutcome,
  supabase: SupabaseClient<Database>,
): Promise<SenseiQuoteRow | null> {
  try {
    const { data, error } = await supabase
      .from('sensei_quotes')
      .select('*')
      .eq('outcome', outcome)
      .limit(50);

    if (error || !data || data.length === 0) return null;
    return pickRandom(data as SenseiQuoteRow[]);
  } catch {
    return null;
  }
}
