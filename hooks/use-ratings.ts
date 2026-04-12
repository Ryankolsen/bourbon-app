import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

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
