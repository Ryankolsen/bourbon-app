/**
 * useSacredPour — state machine hook for the Sacred Pour mini-game.
 *
 * Wires together KataSequenceGenerator and useGameDailySession into a
 * full kata loop: difficulty selection, bourbon reveal, sequence playback,
 * card-grid submission, and scoring.
 *
 * State machine: difficulty_select → loading → reveal → playback → grid → scoring
 *
 * XP multipliers: training 0.5×, standard 1.0×, challenge 1.5×
 * XP base amounts: perfect 100, partial 80 × accuracy fraction, floor 10 (never zero)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import {
  generateKataSequence,
  KataSequenceResult,
  Difficulty,
} from '@/lib/kata-sequence-generator';
import { useGameDailySession } from '@/hooks/use-game-daily-session';

type XpEventType = Database['public']['Enums']['xp_event_type'];
type BourbonRow = Database['public']['Tables']['bourbons']['Row'];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SacredPourGameState =
  | 'difficulty_select'
  | 'loading'
  | 'reveal'
  | 'playback'
  | 'grid'
  | 'scoring';

export type SacredPourOutcome = 'perfect' | 'partial' | 'fail';

export interface SacredPourVerdict {
  outcome: SacredPourOutcome;
  xpEarned: number;
  correctCount: number;
  totalCount: number;
  /** Fraction 0–1 of correctly placed cards. */
  accuracy: number;
  senseiQuote: string | null;
}

export interface UseSacredPourOptions {
  userId: string | null | undefined;
  beltLevel: number;
  /** If provided, the hook auto-starts loading on mount (skips difficulty_select). */
  difficulty?: Difficulty;
}

export interface UseSacredPourResult {
  state: SacredPourGameState;
  difficulty: Difficulty | null;
  /** Target bourbon whose descriptors form the sequence. Available from reveal onward. */
  bourbon: BourbonRow | null;
  /** Ordered correct sequence the player must recreate. Available from reveal onward. */
  sequence: string[] | null;
  /** All cards (sequence + distractors) shuffled for the grid. Available from grid onward. */
  cards: string[] | null;
  /** Cards the player has tapped so far into the answer tray. */
  playerSequence: string[];
  verdict: SacredPourVerdict | null;
  error: string | null;
  /** Transition from difficulty_select → loading. */
  selectDifficulty: (d: Difficulty) => Promise<void>;
  /** Transition reveal → playback (call after bourbon reveal display completes). */
  advanceToPlayback: () => void;
  /** Transition playback → grid (call after card-animation sequence completes). */
  advanceToGrid: () => void;
  /** Add a card to the player's answer tray (no-op when tray is full). */
  tapCard: (card: string) => void;
  /** Remove the last card from the player's answer tray. */
  undo: () => void;
  /** Evaluate the player's sequence and advance to scoring. */
  submitSequence: () => Promise<void>;
  /** Reset back to difficulty_select (or auto-start loading if initialDifficulty provided). */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const XP_PERFECT = 100;
const XP_PARTIAL = 80;
const XP_FLOOR = 10;

const XP_MULTIPLIER: Record<Difficulty, number> = {
  training: 0.5,
  standard: 1.0,
  challenge: 1.5,
};

const OUTCOME_SENSEI_KEY: Record<
  SacredPourOutcome,
  'pour_perfect' | 'pour_partial' | 'pour_fail'
> = {
  perfect: 'pour_perfect',
  partial: 'pour_partial',
  fail: 'pour_fail',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function computeOutcome(
  playerSeq: string[],
  correctSeq: string[],
): SacredPourOutcome {
  const correctCount = playerSeq.filter(
    (card, i) => card === correctSeq[i],
  ).length;
  if (correctCount === correctSeq.length && playerSeq.length === correctSeq.length) {
    return 'perfect';
  }
  if (correctCount > 0) return 'partial';
  return 'fail';
}

function computeXp(
  outcome: SacredPourOutcome,
  difficulty: Difficulty,
  accuracy: number,
): number {
  const multiplier = XP_MULTIPLIER[difficulty];
  if (outcome === 'perfect') {
    return Math.round(XP_PERFECT * multiplier);
  }
  if (outcome === 'partial') {
    return Math.max(
      Math.round(XP_FLOOR * multiplier),
      Math.round(XP_PARTIAL * multiplier * accuracy),
    );
  }
  // fail — floor XP (participation, never zero)
  return Math.max(1, Math.round(XP_FLOOR * multiplier));
}

async function fetchSenseiQuote(
  outcome: SacredPourOutcome,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('sensei_quotes')
      .select('quote')
      .eq('outcome', OUTCOME_SENSEI_KEY[outcome])
      .limit(10);

    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)].quote;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSacredPour({
  userId,
  beltLevel,
  difficulty: initialDifficulty,
}: UseSacredPourOptions): UseSacredPourResult {
  const { recordPlay } = useGameDailySession(userId, 'sacred_pour');

  const [state, setState] = useState<SacredPourGameState>('difficulty_select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(
    initialDifficulty ?? null,
  );
  const [kataResult, setKataResult] = useState<KataSequenceResult | null>(null);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<SacredPourVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutable refs for use inside callbacks (avoid stale closures)
  const kataRef = useRef<KataSequenceResult | null>(null);
  const difficultyRef = useRef<Difficulty | null>(initialDifficulty ?? null);
  const playerSequenceRef = useRef<string[]>([]);
  const autoStartedRef = useRef(false);

  // ── loadGame ──────────────────────────────────────────────────────────────

  const loadGame = useCallback(
    async (d: Difficulty) => {
      setState('loading');
      setDifficulty(d);
      difficultyRef.current = d;
      setError(null);
      setPlayerSequence([]);
      playerSequenceRef.current = [];
      setVerdict(null);
      kataRef.current = null;
      setKataResult(null);

      try {
        const result = await generateKataSequence(beltLevel, d, supabase);
        kataRef.current = result;
        setKataResult(result);
        setState('reveal');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      }
    },
    [beltLevel],
  );

  // Auto-start if difficulty was provided at construction
  useEffect(() => {
    if (initialDifficulty && !autoStartedRef.current) {
      autoStartedRef.current = true;
      loadGame(initialDifficulty);
    }
  }, [initialDifficulty, loadGame]);

  // ── selectDifficulty ─────────────────────────────────────────────────────

  const selectDifficulty = useCallback(
    async (d: Difficulty) => {
      await loadGame(d);
    },
    [loadGame],
  );

  // ── advanceToPlayback ─────────────────────────────────────────────────────

  const advanceToPlayback = useCallback(() => {
    setState('playback');
  }, []);

  // ── advanceToGrid ─────────────────────────────────────────────────────────

  const advanceToGrid = useCallback(() => {
    setState('grid');
  }, []);

  // ── tapCard ───────────────────────────────────────────────────────────────

  const tapCard = useCallback((card: string) => {
    const kata = kataRef.current;
    if (!kata) return;
    if (playerSequenceRef.current.length >= kata.sequence.length) return;
    const next = [...playerSequenceRef.current, card];
    playerSequenceRef.current = next;
    setPlayerSequence(next);
  }, []);

  // ── undo ──────────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    const next = playerSequenceRef.current.slice(0, -1);
    playerSequenceRef.current = next;
    setPlayerSequence(next);
  }, []);

  // ── submitSequence ────────────────────────────────────────────────────────

  const submitSequence = useCallback(async () => {
    const kata = kataRef.current;
    const d = difficultyRef.current;
    if (!kata || !d) return;

    const ps = playerSequenceRef.current;
    const outcome = computeOutcome(ps, kata.sequence);
    const correctCount = ps.filter(
      (card, i) => card === kata.sequence[i],
    ).length;
    const accuracy =
      kata.sequence.length > 0 ? correctCount / kata.sequence.length : 0;
    const xpEarned = computeXp(outcome, d, accuracy);

    const eventType: XpEventType =
      outcome === 'perfect' ? 'sacred_pour_perfect' : 'sacred_pour_complete';

    // Award XP
    if (userId) {
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_event_type: eventType,
        p_xp_amount: xpEarned,
      });
    }

    // Fetch sensei quote and record play concurrently
    const [senseiQuote] = await Promise.all([
      fetchSenseiQuote(outcome),
      recordPlay(xpEarned),
    ]);

    setVerdict({
      outcome,
      xpEarned,
      correctCount,
      totalCount: kata.sequence.length,
      accuracy,
      senseiQuote,
    });
    setState('scoring');
  }, [userId, recordPlay]);

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState('difficulty_select');
    setDifficulty(initialDifficulty ?? null);
    difficultyRef.current = initialDifficulty ?? null;
    setKataResult(null);
    kataRef.current = null;
    setPlayerSequence([]);
    playerSequenceRef.current = [];
    setVerdict(null);
    setError(null);
    autoStartedRef.current = false;

    if (initialDifficulty) {
      loadGame(initialDifficulty);
    }
  }, [initialDifficulty, loadGame]);

  return {
    state,
    difficulty,
    bourbon: kataResult?.bourbon ?? null,
    sequence: kataResult?.sequence ?? null,
    cards: kataResult?.cards ?? null,
    playerSequence,
    verdict,
    error,
    selectDifficulty,
    advanceToPlayback,
    advanceToGrid,
    tapCard,
    undo,
    submitSequence,
    reset,
  };
}
