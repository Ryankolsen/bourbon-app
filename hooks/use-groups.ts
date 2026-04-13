import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildRecommendationPayload } from "@/lib/groups";

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/** Groups the current user is an accepted member of (includes group metadata) */
export function useMyGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-groups", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, role, status, groups(*)")
        .eq("user_id", userId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/** Pending invitations for the current user */
export function useGroupInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ["group-invites", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select(
          "group_id, role, status, invited_by, created_at, groups(*), profiles!group_members_invited_by_fkey(display_name, username, avatar_url)"
        )
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/** Single group row (visible to accepted members) */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

/** Members (all statuses) of a group — useful for owner management view */
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select(
          "user_id, role, status, invited_by, created_at, profiles!group_members_user_id_fkey(display_name, username, avatar_url)"
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new group.  Also inserts the creator as the owner (accepted).
 */
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      name,
      description,
    }: {
      userId: string;
      name: string;
      description?: string;
    }) => {
      // Insert group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({ name, description: description ?? null, created_by: userId })
        .select()
        .single();
      if (groupError) throw groupError;

      // Add creator as owner + accepted
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: userId,
          role: "owner",
          status: "accepted",
          invited_by: null,
        });
      if (memberError) throw memberError;

      return group;
    },
    onSuccess: (_group, { userId }) => {
      qc.invalidateQueries({ queryKey: ["my-groups", userId] });
    },
  });
}

/** Invite a user (by userId) to a group.  Only group owners can do this. */
export function useInviteToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      inviteeId,
      inviterId,
    }: {
      groupId: string;
      inviteeId: string;
      inviterId: string;
    }) => {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: inviteeId,
        role: "member",
        status: "pending",
        invited_by: inviterId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

/** Accept a pending group invite */
export function useAcceptGroupInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .update({ status: "accepted" })
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: ["group-invites", userId] });
      qc.invalidateQueries({ queryKey: ["my-groups", userId] });
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

/** Decline a pending group invite — removes the membership row entirely */
export function useDeclineGroupInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: (_data, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: ["group-invites", userId] });
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────────────────────

/** List all recommendations for a group (accepted members only, via RLS) */
export function useGroupRecommendations(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-recommendations", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from("group_recommendations")
        .select(
          "*, profiles!group_recommendations_recommended_by_fkey(display_name, username, avatar_url), bourbons(id, name, distillery)"
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

/** Recommend a bourbon to a group */
export function useRecommendBourbon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      bourbonId,
      userId,
      note,
    }: {
      groupId: string;
      bourbonId: string;
      userId: string;
      note?: string;
    }) => {
      const { error } = await supabase
        .from("group_recommendations")
        .insert(buildRecommendationPayload(groupId, bourbonId, userId, note));
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-recommendations", groupId] });
    },
  });
}

/** Whether the viewing user shares an accepted group with the target user */
export function useSharesGroup(
  viewerId: string | undefined,
  targetId: string | undefined
) {
  return useQuery({
    queryKey: ["shares-group", viewerId, targetId],
    queryFn: async () => {
      if (!viewerId || !targetId || viewerId === targetId) return false;
      // Get groups the viewer belongs to
      const { data: viewerGroups, error: e1 } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", viewerId)
        .eq("status", "accepted");
      if (e1) throw e1;
      if (!viewerGroups || viewerGroups.length === 0) return false;

      const groupIds = viewerGroups.map((m) => m.group_id);
      // Check if target is an accepted member of any of those groups
      const { data: overlap, error: e2 } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", targetId)
        .eq("status", "accepted")
        .in("group_id", groupIds)
        .limit(1);
      if (e2) throw e2;
      return (overlap?.length ?? 0) > 0;
    },
    enabled: !!viewerId && !!targetId && viewerId !== targetId,
  });
}

/** Update a group's name and description (owner only — enforced by RLS) */
export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      description,
    }: {
      groupId: string;
      name: string;
      description: string | null;
    }) => {
      const { error } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          description: description === "" ? null : description,
        })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}

/** Remove an accepted member from a group (owner only — enforced by RLS) */
export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

/** Leave a group (delete own membership row) */
export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: ["my-groups", userId] });
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}
