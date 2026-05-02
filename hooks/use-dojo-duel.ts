/**
 * useDojoDuel — state machine hook for the Dojo Duel mini-game.
 *
 * Wires together DuelQuestionGenerator, GhostOpponentService, and
 * useGameDailySession into a complete 3-round duel loop.
 *
 * State machine: difficulty_select → loading → round_1 → round_2 → round_3 → verdict
 *
 * XP multipliers: training 0.5×, standard 1.0×, challenge 1.5×
 * XP base amounts: loss 10, win 40, sweep 75
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import {
  generateDuelQuestions,
  Difficulty,
  DuelQuestionSet,
} from '@/lib/duel-question-generator';

type XpEventType = Database['public']['Enums']['xp_event_type'];
import {
  fetchGhost,
  saveGhostRun,
  GhostRun,
  RoundResult,
} from '@/lib/ghost-opponent-service';
import { useGameDailySession } from '@/hooks/use-game-daily-session';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DuelGameState =
  | 'difficulty_select'
  | 'loading'
  | 'round_1'
  | 'round_2'
  | 'round_3'
  | 'verdict';

export type DuelOutcome = 'win' | 'loss' | 'sweep';

export interface DuelVerdict {
  outcome: DuelOutcome;
  xpEarned: number;
  playerRoundWins: number;
  ghostRoundWins: number;
  senseiQuote: string | null;
  roundResults: RoundResult[];
}

export interface UseDojoDuelOptions {
  userId: string | null | undefined;
  beltLevel: number;
  /** If provided, the hook auto-starts loading on mount. */
  difficulty?: Difficulty;
}

export interface UseDojoDuelResult {
  state: DuelGameState;
  questions: DuelQuestionSet | null;
  ghost: GhostRun | null;
  playerHealth: number;
  ghostHealth: number;
  difficulty: Difficulty | null;
  verdict: DuelVerdict | null;
  error: string | null;
  /** Call to transition from difficulty_select → loading. */
  selectDifficulty: (d: Difficulty) => Promise<void>;
  /** Call with the player's answer for the current round. */
  submitAnswer: (answer: string) => Promise<void>;
  /** Reset the hook back to difficulty_select (or loading if initialDifficulty provided). */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const XP_BASE: Record<DuelOutcome, number> = {
  loss: 10,
  win: 40,
  sweep: 75,
};

const XP_MULTIPLIER: Record<Difficulty, number> = {
  training: 0.5,
  standard: 1.0,
  challenge: 1.5,
};

const OUTCOME_EVENT_TYPE: Record<DuelOutcome, string> = {
  loss: 'dojo_duel_loss',
  win: 'dojo_duel_win',
  sweep: 'dojo_duel_sweep',
};

const OUTCOME_SENSEI_KEY: Record<
  DuelOutcome,
  'duel_win' | 'duel_loss' | 'duel_sweep'
> = {
  win: 'duel_win',
  loss: 'duel_loss',
  sweep: 'duel_sweep',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function calculateXp(outcome: DuelOutcome, difficulty: Difficulty): number {
  return Math.round(XP_BASE[outcome] * XP_MULTIPLIER[difficulty]);
}

function getGhostWon(ghost: GhostRun | null, round: 1 | 2 | 3): boolean {
  if (!ghost) return false;
  const key = `round${round}` as 'round1' | 'round2' | 'round3';
  return ghost.round_results[key].correct;
}

function isAnswerCorrect(
  questions: DuelQuestionSet,
  round: 1 | 2 | 3,
  answer: string,
): boolean {
  if (round === 1) {
    return answer === questions.rounds[0].correctAnswer;
  }
  if (round === 2) {
    return answer === questions.rounds[1].correctAnswer;
  }
  // Round 3 (fake_note): correct if the player picked the note marked isFake
  return (
    questions.rounds[2].notes.find((n) => n.text === answer)?.isFake ?? false
  );
}

async function fetchSenseiQuote(
  outcome: DuelOutcome,
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

export function useDojoDuel({
  userId,
  beltLevel,
  difficulty: initialDifficulty,
}: UseDojoDuelOptions): UseDojoDuelResult {
  const { recordPlay } = useGameDailySession(userId, 'dojo_duel');

  const [state, setState] = useState<DuelGameState>('difficulty_select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(
    initialDifficulty ?? null,
  );
  const [questions, setQuestions] = useState<DuelQuestionSet | null>(null);
  const [ghost, setGhost] = useState<GhostRun | null>(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [ghostHealth, setGhostHealth] = useState(100);
  const [verdict, setVerdict] = useState<DuelVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutable refs for round state (avoid stale closures in submitAnswer)
  const questionsRef = useRef<DuelQuestionSet | null>(null);
  const ghostRef = useRef<GhostRun | null>(null);
  const difficultyRef = useRef<Difficulty | null>(initialDifficulty ?? null);
  const roundIndexRef = useRef(0); // 0 = round 1, 1 = round 2, 2 = round 3
  const playerWinsRef = useRef(0);
  const ghostWinsRef = useRef(0);
  const roundResultsRef = useRef<RoundResult[]>([]);
  const roundStartTimeRef = useRef<number>(Date.now());
  const autoStartedRef = useRef(false);

  // ── loadGame ──────────────────────────────────────────────────────────────

  const loadGame = useCallback(
    async (d: Difficulty) => {
      setState('loading');
      setDifficulty(d);
      difficultyRef.current = d;
      setError(null);

      // Reset round tracking
      roundIndexRef.current = 0;
      playerWinsRef.current = 0;
      ghostWinsRef.current = 0;
      roundResultsRef.current = [];
      setPlayerHealth(100);
      setGhostHealth(100);
      setVerdict(null);
      questionsRef.current = null;
      ghostRef.current = null;

      try {
        const [qs, gh] = await Promise.all([
          generateDuelQuestions(beltLevel, d, supabase),
          fetchGhost(beltLevel, d, userId ?? null, supabase),
        ]);

        questionsRef.current = qs;
        ghostRef.current = gh;
        setQuestions(qs);
        setGhost(gh);
        roundStartTimeRef.current = Date.now();
        setState('round_1');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load game',
        );
      }
    },
    [beltLevel, userId],
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

  // ── submitAnswer ──────────────────────────────────────────────────────────

  const submitAnswer = useCallback(
    async (answer: string) => {
      const qs = questionsRef.current;
      const d = difficultyRef.current;
      if (!qs || !d) return;

      const roundIndex = roundIndexRef.current;
      const round = (roundIndex + 1) as 1 | 2 | 3;
      const responseMs = Date.now() - roundStartTimeRef.current;

      const playerWon = isAnswerCorrect(qs, round, answer);
      const ghostWon = getGhostWon(ghostRef.current, round);

      if (playerWon) playerWinsRef.current += 1;
      if (ghostWon) ghostWinsRef.current += 1;

      roundResultsRef.current.push({ round, playerWon, responseMs });

      // Decrement health bars
      if (!playerWon) setPlayerHealth((h) => Math.max(0, h - 33));
      if (!ghostWon) setGhostHealth((h) => Math.max(0, h - 33));

      const nextRoundIndex = roundIndex + 1;
      roundIndexRef.current = nextRoundIndex;

      if (nextRoundIndex >= 3) {
        // ── Game over ──
        const playerWins = playerWinsRef.current;
        const outcome: DuelOutcome =
          playerWins === 3 ? 'sweep' : playerWins >= 2 ? 'win' : 'loss';

        const xpEarned = calculateXp(outcome, d);

        // Award XP
        if (userId) {
          await supabase.rpc('award_xp', {
            p_user_id: userId,
            p_event_type: OUTCOME_EVENT_TYPE[outcome] as XpEventType,
            p_xp_amount: xpEarned,
          });
        }

        // Fetch sensei quote and record play concurrently
        const [senseiQuote] = await Promise.all([
          fetchSenseiQuote(outcome),
          recordPlay(xpEarned),
        ]);

        // Save ghost run (fire-and-forget)
        if (userId) {
          saveGhostRun(
            userId,
            beltLevel,
            d,
            roundResultsRef.current,
            xpEarned,
            supabase,
          );
        }

        setVerdict({
          outcome,
          xpEarned,
          playerRoundWins: playerWins,
          ghostRoundWins: ghostWinsRef.current,
          senseiQuote,
          roundResults: roundResultsRef.current,
        });
        setState('verdict');
      } else {
        // Advance to next round
        roundStartTimeRef.current = Date.now();
        setState(`round_${nextRoundIndex + 1}` as DuelGameState);
      }
    },
    [beltLevel, userId, recordPlay],
  );

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState('difficulty_select');
    setDifficulty(initialDifficulty ?? null);
    difficultyRef.current = initialDifficulty ?? null;
    setQuestions(null);
    questionsRef.current = null;
    setGhost(null);
    ghostRef.current = null;
    setPlayerHealth(100);
    setGhostHealth(100);
    setVerdict(null);
    setError(null);
    roundIndexRef.current = 0;
    playerWinsRef.current = 0;
    ghostWinsRef.current = 0;
    roundResultsRef.current = [];
    autoStartedRef.current = false;

    if (initialDifficulty) {
      loadGame(initialDifficulty);
    }
  }, [initialDifficulty, loadGame]);

  return {
    state,
    questions,
    ghost,
    playerHealth,
    ghostHealth,
    difficulty,
    verdict,
    error,
    selectDifficulty,
    submitAnswer,
    reset,
  };
}
