/**
 * GhostOpponentService — fetch and persist async ghost runs for Dojo Duel.
 *
 * fetchGhost: Selects a ghost run within ±1 belt level of the current player.
 *   Prefers real player runs over cold-start seeds. Never returns the current
 *   user's own run. Returns null on any error.
 *
 * saveGhostRun: Writes a completed duel run to duel_ghost_runs so it becomes
 *   available as a future ghost for other players. Fire-and-forget — errors
 *   are swallowed since ghost saving is non-critical.
 *
 * Both functions accept an injectable supabase client for full testability.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { Difficulty } from '@/lib/duel-question-generator';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GhostRun = Database['public']['Tables']['duel_ghost_runs']['Row'];

/** Per-round outcome reported by the game loop after a duel. */
export interface RoundResult {
  round: 1 | 2 | 3;
  /** Whether the player won this round. */
  playerWon: boolean;
  /** Player's response time in milliseconds. */
  responseMs: number;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// fetchGhost
// ---------------------------------------------------------------------------

/**
 * Fetch a ghost opponent run for a duel session.
 *
 * Selection rules:
 * 1. Belt level must be within ±1 of the current player's belt level.
 * 2. Never return the current player's own run.
 * 3. Among matching rows, prefer real player runs (user_id IS NOT NULL) over
 *    cold-start seeds (user_id IS NULL).
 * 4. Among real player runs, pick randomly to avoid everyone fighting the same ghost.
 * 5. If no real player runs exist, fall back to any seed in the belt range.
 * 6. Return null if no ghost can be found or on any DB error.
 *
 * @param beltLevel  Current player's belt level (1–10).
 * @param difficulty Session difficulty (unused in query; included for future filtering).
 * @param userId     Current player's user ID. Pass null if not authenticated.
 * @param supabase   Typed Supabase client (injectable for testing).
 */
export async function fetchGhost(
  beltLevel: number,
  difficulty: Difficulty,
  userId: string | null,
  supabase: SupabaseClient<Database>,
): Promise<GhostRun | null> {
  // Clamp belt range to 1–10 and deduplicate at the edges
  const beltRange = [...new Set([
    Math.max(1, beltLevel - 1),
    beltLevel,
    Math.min(10, beltLevel + 1),
  ])];

  try {
    let query = supabase
      .from('duel_ghost_runs')
      .select('*')
      .in('belt_level', beltRange);

    // Exclude current user's runs while keeping cold-start seeds (user_id IS NULL)
    if (userId) {
      query = query.or(`user_id.is.null,user_id.neq.${userId}`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    const rows = data as GhostRun[];

    // Prefer real player runs over seeds
    const realRuns = rows.filter((r) => r.user_id !== null);
    const pool = realRuns.length > 0 ? realRuns : rows;

    return pickRandom(pool);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// saveGhostRun
// ---------------------------------------------------------------------------

/**
 * Persist a completed duel run so it can serve as a future ghost opponent.
 *
 * Fire-and-forget: any DB error is silently swallowed. The caller does not
 * need to await this if they don't want to block UI on ghost saving.
 *
 * @param userId       The player who completed the duel.
 * @param beltLevel    Player's belt level at time of duel.
 * @param difficulty   Difficulty tier played.
 * @param roundResults Array of per-round outcomes (rounds 1–3).
 * @param xpEarned     XP awarded for this duel run.
 * @param supabase     Typed Supabase client (injectable for testing).
 */
export async function saveGhostRun(
  userId: string,
  beltLevel: number,
  difficulty: Difficulty,
  roundResults: RoundResult[],
  xpEarned: number,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  try {
    const getResult = (round: 1 | 2 | 3) => {
      const r = roundResults.find((x) => x.round === round);
      return {
        correct: r?.playerWon ?? false,
        time_ms: r?.responseMs ?? 0,
      };
    };

    await supabase.from('duel_ghost_runs').insert({
      user_id: userId,
      belt_level: beltLevel,
      difficulty,
      round_results: {
        round1: getResult(1),
        round2: getResult(2),
        round3: getResult(3),
      },
      xp_earned: xpEarned,
    });
  } catch {
    // Ghost saving is non-critical — swallow all errors
  }
}
