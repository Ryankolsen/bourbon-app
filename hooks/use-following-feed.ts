import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface FeedItem {
  id: string;
  user_id: string;
  bourbon_id: string;
  rating: number | null;
  tasted_at: string;
  created_at: string;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall_notes: string | null;
  collection_id: string | null;
  bourbon_name: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
}

export function useFollowingFeed(userId: string | undefined) {
  return useQuery({
    queryKey: ["following-feed", userId],
    queryFn: async (): Promise<FeedItem[]> => {
      if (!userId) return [];

      // Step 1: get IDs of users this user follows
      const { data: follows, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (followsError) throw followsError;

      const followedIds = (follows ?? []).map(
        (f: { following_id: string }) => f.following_id
      );
      if (followedIds.length === 0) return [];

      // Step 2: fetch tastings for followed users with joined data
      const { data, error } = await supabase
        .from("tastings")
        .select(
          `*, profiles!tastings_user_id_fkey(avatar_url, display_name, username), bourbons!tastings_bourbon_id_fkey(name), tasting_likes(count), tasting_comments(count)`
        )
        .in("user_id", followedIds)
        .order("tasted_at", { ascending: false });
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((item: any): FeedItem => ({
        id: item.id,
        user_id: item.user_id,
        bourbon_id: item.bourbon_id,
        rating: item.rating,
        tasted_at: item.tasted_at,
        created_at: item.created_at,
        nose: item.nose,
        palate: item.palate,
        finish: item.finish,
        overall_notes: item.overall_notes,
        collection_id: item.collection_id,
        bourbon_name: item.bourbons?.name ?? "",
        display_name: item.profiles?.display_name ?? null,
        username: item.profiles?.username ?? null,
        avatar_url: item.profiles?.avatar_url ?? null,
        like_count: Number(item.tasting_likes?.[0]?.count ?? 0),
        comment_count: Number(item.tasting_comments?.[0]?.count ?? 0),
      }));
    },
    enabled: !!userId,
  });
}
