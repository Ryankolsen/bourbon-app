import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  getBeltConfig,
  getBeltForXp,
  getBeltProgressPercent,
  getXpToNextBelt,
} from "@/lib/belt-config";

export interface UserXpState {
  totalXp: number;
  currentBelt: number;
  beltName: string;
  xpToNextBelt: number;
  progressPercent: number;
  streakDays: number;
  isLoading: boolean;
  error: Error | null;
}

const DEFAULT_XP_STATE: Omit<UserXpState, "isLoading" | "error"> = {
  totalXp: 0,
  currentBelt: 1,
  beltName: "White Dog",
  xpToNextBelt: 200,
  progressPercent: 0,
  streakDays: 0,
};

function deriveXpState(row: {
  total_xp: number;
  current_belt: number;
  streak_days: number;
} | null): Omit<UserXpState, "isLoading" | "error"> {
  if (!row) return DEFAULT_XP_STATE;

  const totalXp = row.total_xp;
  const currentBelt = getBeltForXp(totalXp);
  const beltName = getBeltConfig(currentBelt).name;
  const xpToNextBelt = getXpToNextBelt(totalXp);
  const progressPercent = getBeltProgressPercent(totalXp);

  return {
    totalXp,
    currentBelt,
    beltName,
    xpToNextBelt,
    progressPercent,
    streakDays: row.streak_days,
  };
}

export function useUserXp(userId: string | undefined): UserXpState {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-xp", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_xp")
        .select("*")
        .eq("user_id", userId as string)
        .single();
      if (error) {
        // PGRST116 = no rows found — treat as new user with no XP yet
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  if (!userId || isLoading) {
    return {
      ...DEFAULT_XP_STATE,
      isLoading: isLoading && !!userId,
      error: null,
    };
  }

  if (error) {
    return {
      ...DEFAULT_XP_STATE,
      isLoading: false,
      error: error as Error,
    };
  }

  return {
    ...deriveXpState(data ?? null),
    isLoading: false,
    error: null,
  };
}
