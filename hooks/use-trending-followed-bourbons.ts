import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  computeTrendingByTasteCount,
  computeTrendingByRating,
  TrendingTastingInput,
} from "@/lib/trending";

export interface TrendingFollowedBourbons {
  byTasteCount: string[];
  byRating: string[];
}

const TRENDING_WINDOW_DAYS = 30;

/**
 * Fetches tastings from users the current user follows in the last 30 days,
 * then runs both trending compute functions and returns sorted bourbon ID lists.
 */
export function useTrendingFollowedBourbons(
  userId: string | undefined,
): ReturnType<typeof useQuery<TrendingFollowedBourbons>> {
  return useQuery({
    queryKey: ["trending-followed-bourbons", userId],
    queryFn: async (): Promise<TrendingFollowedBourbons> => {
      if (!userId) return { byTasteCount: [], byRating: [] };

      // Step 1: get followed user IDs
      const { data: follows, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (followsError) throw followsError;

      const followedIds = (follows ?? []).map(
        (f: { following_id: string }) => f.following_id,
      );
      if (followedIds.length === 0) return { byTasteCount: [], byRating: [] };

      // Step 2: fetch tastings in the 30-day window
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - TRENDING_WINDOW_DAYS);
      const cutoffIso = cutoffDate.toISOString();

      const { data, error } = await supabase
        .from("tastings")
        .select("bourbon_id, tasted_at, rating")
        .in("user_id", followedIds)
        .gte("tasted_at", cutoffIso);
      if (error) throw error;

      const tastings: TrendingTastingInput[] = (data ?? []).map(
        (row: { bourbon_id: string; tasted_at: string; rating: number | null }) => ({
          bourbon_id: row.bourbon_id,
          tasted_at: row.tasted_at,
          rating: row.rating,
        }),
      );

      return {
        byTasteCount: computeTrendingByTasteCount(tastings, cutoffIso),
        byRating: computeTrendingByRating(tastings, cutoffIso),
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
