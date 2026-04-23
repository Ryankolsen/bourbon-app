import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CheckInResult {
  streakDays: number;
  lastXpAwarded: number;
  promoted: boolean;
  newBelt: number;
  isLoading: boolean;
}

const DEFAULT_RESULT: CheckInResult = {
  streakDays: 0,
  lastXpAwarded: 0,
  promoted: false,
  newBelt: 1,
  isLoading: true,
};

/**
 * Calls the `check_in()` RPC once on mount (once per app session).
 * The RPC is idempotent — multiple calls on the same calendar day are no-ops.
 *
 * Exposes { streakDays, lastXpAwarded, promoted, newBelt, isLoading }.
 * Callers should watch `lastXpAwarded > 0` to show XP toast, and
 * `promoted === true` to show belt-up modal (once those contexts exist).
 */
export function useCheckIn(): CheckInResult {
  const [result, setResult] = useState<CheckInResult>(DEFAULT_RESULT);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data, error } = await supabase.rpc("check_in");
      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setResult((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const row = data[0];
      setResult({
        streakDays: row.streak_days,
        lastXpAwarded: row.xp_awarded,
        promoted: row.promoted,
        newBelt: row.new_belt,
        isLoading: false,
      });
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []); // empty dep array: fires once on mount

  return result;
}
