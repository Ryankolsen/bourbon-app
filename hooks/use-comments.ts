import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type CommentRow = Database["public"]["Tables"]["bourbon_comments"]["Row"];
type CommentInsert = Database["public"]["Tables"]["bourbon_comments"]["Insert"];

export type CommentWithProfile = CommentRow & {
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

/** Public comments for a bourbon (visibility = 'public'). */
export function useComments(bourbonId: string | undefined) {
  return useQuery({
    queryKey: ["comments", bourbonId],
    queryFn: async () => {
      if (!bourbonId) return [];
      const { data, error } = await supabase
        .from("bourbon_comments")
        .select(`*, profiles(display_name, username, avatar_url)`)
        .eq("bourbon_id", bourbonId)
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CommentWithProfile[];
    },
    enabled: !!bourbonId,
  });
}

/** Group-only comments for a bourbon within a specific group. */
export function useGroupComments(
  bourbonId: string | undefined,
  groupId: string | undefined
) {
  return useQuery({
    queryKey: ["group-comments", bourbonId, groupId],
    queryFn: async () => {
      if (!bourbonId || !groupId) return [];
      const { data, error } = await supabase
        .from("bourbon_comments")
        .select(`*, profiles(display_name, username, avatar_url)`)
        .eq("bourbon_id", bourbonId)
        .eq("visibility", "group")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CommentWithProfile[];
    },
    enabled: !!bourbonId && !!groupId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: CommentInsert) => {
      const { data, error } = await supabase
        .from("bourbon_comments")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data as CommentRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["comments", data.bourbon_id] });
      if (data.group_id) {
        qc.invalidateQueries({
          queryKey: ["group-comments", data.bourbon_id, data.group_id],
        });
      }
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      bourbonId,
      groupId,
    }: {
      id: string;
      bourbonId: string;
      groupId?: string | null;
    }) => {
      const { error } = await supabase
        .from("bourbon_comments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, bourbonId, groupId };
    },
    onSuccess: ({ bourbonId, groupId }) => {
      qc.invalidateQueries({ queryKey: ["comments", bourbonId] });
      if (groupId) {
        qc.invalidateQueries({
          queryKey: ["group-comments", bourbonId, groupId],
        });
      }
    },
  });
}
