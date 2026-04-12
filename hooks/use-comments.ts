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

export function useComments(bourbonId: string | undefined) {
  return useQuery({
    queryKey: ["comments", bourbonId],
    queryFn: async () => {
      if (!bourbonId) return [];
      const { data, error } = await supabase
        .from("bourbon_comments")
        .select(`*, profiles(display_name, username, avatar_url)`)
        .eq("bourbon_id", bourbonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CommentWithProfile[];
    },
    enabled: !!bourbonId,
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
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bourbonId }: { id: string; bourbonId: string }) => {
      const { error } = await supabase
        .from("bourbon_comments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, bourbonId };
    },
    onSuccess: ({ bourbonId }) => {
      qc.invalidateQueries({ queryKey: ["comments", bourbonId] });
    },
  });
}
