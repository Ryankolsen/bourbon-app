import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const DAILY_CAP = 5;

export type GameType = "dojo_duel" | "pour_or_faker";

export interface GameDailySessionState {
  playsRemaining: number;
  canPlay: boolean;
  totalPlaysToday: number;
  recordPlay: (xpEarned: number) => Promise<void>;
  resetTime: Date;
  isLoading: boolean;
}

function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMidnightTonight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function useGameDailySession(
  userId: string | null | undefined,
  gameType: GameType
): GameDailySessionState {
  const today = getTodayLocalDate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["game-daily-session", userId, gameType, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_daily_sessions")
        .select("*")
        .eq("user_id", userId as string)
        .eq("game_type", gameType)
        .eq("date", today)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  const playsUsed = data?.plays_used ?? 0;
  const playsRemaining = !userId ? 0 : Math.max(0, DAILY_CAP - playsUsed);
  const canPlay = playsRemaining > 0;

  async function recordPlay(xpEarned: number): Promise<void> {
    if (!canPlay || !userId) return;

    const newPlaysUsed = playsUsed + 1;
    const newXpEarned = (data?.xp_earned ?? 0) + xpEarned;

    const { error } = await supabase.from("game_daily_sessions").upsert({
      user_id: userId,
      game_type: gameType,
      date: today,
      plays_used: newPlaysUsed,
      xp_earned: newXpEarned,
    });

    if (error) {
      console.error("[recordPlay] upsert failed:", error.message, error.code, { gameType, newPlaysUsed });
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["game-daily-session", userId, gameType, today],
    });
  }

  return {
    playsRemaining,
    canPlay,
    totalPlaysToday: playsUsed,
    recordPlay,
    resetTime: getMidnightTonight(),
    isLoading: isLoading && !!userId,
  };
}
