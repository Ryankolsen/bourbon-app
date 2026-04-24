import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTomorrowXp, TomorrowXp } from "@/lib/streak-utils";

export interface CheckInResult {
  streakDays: number;
  lastXpAwarded: number;
  promoted: boolean;
  newBelt: number;
  isLoading: boolean;
  /** True when streak_days returns as 1 after a prior streak > 1 (broken streak). */
  isReset: boolean;
  /** XP breakdown for tomorrow's check-in, or null before the RPC resolves. */
  tomorrowXp: TomorrowXp | null;
}

const DEFAULT_RESULT: CheckInResult = {
  streakDays: 0,
  lastXpAwarded: 0,
  promoted: false,
  newBelt: 1,
  isLoading: true,
  isReset: false,
  tomorrowXp: null,
};

/**
 * Calls the `check_in()` RPC once per non-null userId per session.
 * The RPC is idempotent — same-day calls are no-ops.
 *
 * Gates on userId: when null or undefined the RPC is never called and
 * isLoading stays false (no active request).
 *
 * Exposes { streakDays, lastXpAwarded, promoted, newBelt, isLoading, isReset, tomorrowXp }.
 */
export function useCheckIn(userId: string | null | undefined): CheckInResult {
  const [result, setResult] = useState<CheckInResult>({
    ...DEFAULT_RESULT,
    isLoading: false,
  });
  const prevStreakRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    setResult((prev) => ({ ...prev, isLoading: true }));

    async function run() {
      const { data, error } = await supabase.rpc("check_in");
      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setResult((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const row = data[0];
      const streakDays: number = row.streak_days;
      const prevStreak = prevStreakRef.current;
      const isReset = streakDays === 1 && prevStreak !== null && prevStreak > 1;
      prevStreakRef.current = streakDays;

      setResult({
        streakDays,
        lastXpAwarded: row.xp_awarded,
        promoted: row.promoted,
        newBelt: row.new_belt,
        isLoading: false,
        isReset,
        tomorrowXp: getTomorrowXp(streakDays),
      });
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return result;
}
