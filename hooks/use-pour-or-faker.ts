/**
 * usePourOrFaker — state machine hook for the Pour or Faker mini-game.
 *
 * Players are shown bourbon names one at a time and must guess Real or Fake.
 * One wrong answer ends the run. The longer the streak, the more XP earned.
 *
 * State machine: idle → loading → playing → game_over
 *
 * XP per correct guess: training 5, standard 10, challenge 15
 * Milestone bonuses (cumulative): +10 at streak 5, +25 at streak 10, +50 at streak 20
 * Minimum XP: 5 (floor applied at game_over)
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { getFakesForDifficulty, Difficulty } from '@/lib/faker-names';
import { useGameDailySession } from '@/hooks/use-game-daily-session';

type XpEventType = Database['public']['Enums']['xp_event_type'];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PourOrFakerGameState = 'idle' | 'loading' | 'playing' | 'game_over';

export interface PourOrFakerCard {
  name: string;
  isReal: boolean;
}

export interface PourOrFakerVerdict {
  streak: number;
  xpEarned: number;
  wasReal: boolean;
  cardName: string;
}

export interface UsePourOrFakerOptions {
  userId: string | null | undefined;
}

export interface UsePourOrFakerResult {
  state: PourOrFakerGameState;
  difficulty: Difficulty | null;
  currentCard: PourOrFakerCard | null;
  streak: number;
  verdict: PourOrFakerVerdict | null;
  error: string | null;
  selectDifficulty: (d: Difficulty) => Promise<void>;
  guess: (answer: 'real' | 'fake') => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOURBON_FETCH_LIMIT = 100;

const XP_PER_GUESS: Record<Difficulty, number> = {
  training: 5,
  standard: 10,
  challenge: 15,
};

const XP_MILESTONES: { streak: number; bonus: number }[] = [
  { streak: 5, bonus: 10 },
  { streak: 10, bonus: 25 },
  { streak: 20, bonus: 50 },
];

const XP_FLOOR = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function computeXp(streak: number, difficulty: Difficulty): number {
  const base = streak * XP_PER_GUESS[difficulty];
  const bonuses = XP_MILESTONES.filter((m) => streak >= m.streak).reduce(
    (sum, m) => sum + m.bonus,
    0,
  );
  return Math.max(XP_FLOOR, base + bonuses);
}

async function buildCardQueue(difficulty: Difficulty): Promise<PourOrFakerCard[]> {
  const { data, error } = await supabase
    .from('bourbons')
    .select('name')
    .limit(BOURBON_FETCH_LIMIT);

  if (error) throw new Error(error.message);

  const realCards: PourOrFakerCard[] = (data ?? []).map((row) => ({
    name: row.name,
    isReal: true,
  }));

  const fakes = getFakesForDifficulty(difficulty);
  const fakeCards: PourOrFakerCard[] = fakes.map((name) => ({
    name,
    isReal: false,
  }));

  return shuffle([...realCards, ...fakeCards]);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePourOrFaker({ userId }: UsePourOrFakerOptions): UsePourOrFakerResult {
  const { recordPlay } = useGameDailySession(userId, 'pour_or_faker');

  const [state, setState] = useState<PourOrFakerGameState>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [streak, setStreak] = useState(0);
  const [currentCard, setCurrentCard] = useState<PourOrFakerCard | null>(null);
  const [verdict, setVerdict] = useState<PourOrFakerVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutable refs to avoid stale closures in callbacks
  const queueRef = useRef<PourOrFakerCard[]>([]);
  const streakRef = useRef(0);
  const difficultyRef = useRef<Difficulty | null>(null);

  // ── selectDifficulty ────────────────────────────────────────────────────

  const selectDifficulty = useCallback(async (d: Difficulty) => {
    setState('loading');
    setDifficulty(d);
    difficultyRef.current = d;
    setStreak(0);
    streakRef.current = 0;
    setCurrentCard(null);
    setVerdict(null);
    setError(null);
    queueRef.current = [];

    try {
      const queue = await buildCardQueue(d);
      queueRef.current = queue;
      setCurrentCard(queue[0] ?? null);
      setState('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setState('idle');
    }
  }, []);

  // ── guess ───────────────────────────────────────────────────────────────

  const guess = useCallback(
    async (answer: 'real' | 'fake') => {
      const card = currentCard;
      const d = difficultyRef.current;
      if (!card || !d || state !== 'playing') return;

      const correct =
        (answer === 'real' && card.isReal) || (answer === 'fake' && !card.isReal);

      if (correct) {
        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);

        // Advance to next card
        queueRef.current = queueRef.current.slice(1);
        const next = queueRef.current[0] ?? null;

        if (!next) {
          // Queue exhausted — treat as game_over (all real/fakes consumed)
          const xpEarned = computeXp(newStreak, d);
          if (userId) {
            const { error: xpErr } = await supabase.rpc('award_xp', {
              p_user_id: userId,
              p_event_type: 'pour_or_faker_complete' as XpEventType,
              p_xp_amount: xpEarned,
            });
            if (xpErr) console.error('[pour-or-faker] award_xp failed:', xpErr.message);
          }
          await recordPlay(xpEarned);
          setVerdict({ streak: newStreak, xpEarned, wasReal: card.isReal, cardName: card.name });
          setState('game_over');
        } else {
          setCurrentCard(next);
        }
      } else {
        // Wrong answer — game over
        const finalStreak = streakRef.current;
        const xpEarned = computeXp(finalStreak, d);

        if (userId) {
          const { error: xpErr } = await supabase.rpc('award_xp', {
            p_user_id: userId,
            p_event_type: 'pour_or_faker_complete' as XpEventType,
            p_xp_amount: xpEarned,
          });
          if (xpErr) console.error('[pour-or-faker] award_xp failed:', xpErr.message);
        }
        await recordPlay(xpEarned);

        setVerdict({ streak: finalStreak, xpEarned, wasReal: card.isReal, cardName: card.name });
        setState('game_over');
      }
    },
    [currentCard, state, userId, recordPlay],
  );

  // ── reset ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState('idle');
    setDifficulty(null);
    difficultyRef.current = null;
    setStreak(0);
    streakRef.current = 0;
    setCurrentCard(null);
    queueRef.current = [];
    setVerdict(null);
    setError(null);
  }, []);

  return {
    state,
    difficulty,
    currentCard,
    streak,
    verdict,
    error,
    selectDifficulty,
    guess,
    reset,
  };
}
