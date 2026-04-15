import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { normalizeGroupRatingResponse } from "@/lib/ratings";

type RatingStats = Database["public"]["Views"]["bourbon_rating_stats"]["Row"];

/** Aggregate rating stats for a single bourbon across all users. */
export function useBourbonRatingStats(bourbonId: string | undefined) {
  return useQuery({
    queryKey: ["bourbon_rating_stats", bourbonId],
    queryFn: async (): Promise<RatingStats | null> => {
      if (!bourbonId) return null;
      const { data, error } = await supabase
        .from("bourbon_rating_stats")
        .select("*")
        .eq("bourbon_id", bourbonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bourbonId,
  });
}

/** Average rating for a bourbon restricted to accepted members of a group. */
export function useGroupRatingStats(
  bourbonId: string | undefined,
  groupId: string | undefined
) {
  return useQuery({
    queryKey: ["group_rating_stats", groupId, bourbonId],
    queryFn: async (): Promise<{
      avg_rating: number | null;
      rating_count: number;
    } | null> => {
      if (!bourbonId || !groupId) return null;
      const { data, error } = await supabase.rpc("get_group_avg_rating", {
        p_group_id: groupId,
        p_bourbon_id: bourbonId,
      });
      if (error) throw error;
      return normalizeGroupRatingResponse(data);
    },
    enabled: !!bourbonId && !!groupId,
  });
}

/**
 * Batch-fetch the current user's personal tasting ratings.
 * Returns a Map<bourbonId, rating> for O(1) per-card lookup.
 * Tastings where rating is null are excluded.
 */
export function useUserRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_ratings", userId],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!userId) return new Map();
      const { data, error } = await supabase
        .from("tastings")
        .select("bourbon_id, rating")
        .eq("user_id", userId)
        .not("rating", "is", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (row.rating !== null) map.set(row.bourbon_id, row.rating);
      }
      return map;
    },
    enabled: !!userId,
  });
}

/** Aggregate rating stats for all bourbons — used to annotate list views. */
export function useAllBourbonRatingStats() {
  return useQuery({
    queryKey: ["bourbon_rating_stats"],
    queryFn: async (): Promise<RatingStats[]> => {
      const { data, error } = await supabase
        .from("bourbon_rating_stats")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}
