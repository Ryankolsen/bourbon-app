import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Returns a cached Set of bourbon IDs that have been tasted by:
 *   - users the current user follows (via user_follows), and
 *   - members of groups the current user belongs to (via group_members).
 *
 * Used to power the "Social activity" sort on the Explore screen.
 * The sort itself is applied client-side by the caller.
 */
export function useFriendTastedBourbonIds(userId: string | undefined) {
  return useQuery({
    queryKey: ["friend-tasted-bourbon-ids", userId],
    queryFn: async (): Promise<Set<string>> => {
      if (!userId) return new Set<string>();

      // Step 1 — IDs of users this user follows
      const { data: follows, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (followsError) throw followsError;

      const followedIds = (follows ?? []).map((f) => f.following_id);

      // Step 2 — group IDs the user belongs to (accepted only)
      const { data: myGroups, error: groupsError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId)
        .eq("status", "accepted");
      if (groupsError) throw groupsError;

      const groupIds = (myGroups ?? []).map((g) => g.group_id);

      // Step 3 — all accepted members of those groups (excluding self)
      let groupMemberIds: string[] = [];
      if (groupIds.length > 0) {
        const { data: groupMembers, error: membersError } = await supabase
          .from("group_members")
          .select("user_id")
          .in("group_id", groupIds)
          .eq("status", "accepted")
          .neq("user_id", userId);
        if (membersError) throw membersError;
        groupMemberIds = (groupMembers ?? []).map((m) => m.user_id);
      }

      // Union of followed + group member IDs (deduplicated)
      const socialUserIds = [...new Set([...followedIds, ...groupMemberIds])];
      if (socialUserIds.length === 0) return new Set<string>();

      // Step 4 — bourbon IDs tasted by any of those users
      const { data: tastings, error: tastingsError } = await supabase
        .from("tastings")
        .select("bourbon_id")
        .in("user_id", socialUserIds);
      if (tastingsError) throw tastingsError;

      return new Set((tastings ?? []).map((t) => t.bourbon_id));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
