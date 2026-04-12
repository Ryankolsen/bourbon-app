import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildFollowPayload, buildUnfollowTarget } from "@/lib/follows";

/** Number of followers a given user has */
export function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["follower-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

/** Number of users a given user is following */
export function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["following-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

/** Whether the current user (followerId) is following a given user (followingId) */
export function useIsFollowing(
  followerId: string | undefined,
  followingId: string | undefined
) {
  return useQuery({
    queryKey: ["is-following", followerId, followingId],
    queryFn: async () => {
      if (!followerId || !followingId) return false;
      const { data, error } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!followerId && !!followingId,
  });
}

/** List of profiles that follow a given user */
export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_follows")
        .select("follower_id, profiles!user_follows_follower_id_fkey(*)")
        .eq("following_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/** List of profiles a given user follows */
export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ["following", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_follows")
        .select("following_id, profiles!user_follows_following_id_fkey(*)")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      followerId,
      followingId,
    }: {
      followerId: string;
      followingId: string;
    }) => {
      const { error } = await supabase
        .from("user_follows")
        .insert(buildFollowPayload(followerId, followingId));
      if (error) throw error;
      return { followerId, followingId };
    },
    onSuccess: ({ followerId, followingId }) => {
      qc.invalidateQueries({ queryKey: ["is-following", followerId, followingId] });
      qc.invalidateQueries({ queryKey: ["follower-count", followingId] });
      qc.invalidateQueries({ queryKey: ["following-count", followerId] });
      qc.invalidateQueries({ queryKey: ["followers", followingId] });
      qc.invalidateQueries({ queryKey: ["following", followerId] });
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      followerId,
      followingId,
    }: {
      followerId: string;
      followingId: string;
    }) => {
      const target = buildUnfollowTarget(followerId, followingId);
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", target.follower_id)
        .eq("following_id", target.following_id);
      if (error) throw error;
      return { followerId, followingId };
    },
    onSuccess: ({ followerId, followingId }) => {
      qc.invalidateQueries({ queryKey: ["is-following", followerId, followingId] });
      qc.invalidateQueries({ queryKey: ["follower-count", followingId] });
      qc.invalidateQueries({ queryKey: ["following-count", followerId] });
      qc.invalidateQueries({ queryKey: ["followers", followingId] });
      qc.invalidateQueries({ queryKey: ["following", followerId] });
    },
  });
}
