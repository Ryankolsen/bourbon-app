import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildBourbonSearchFilter,
  buildBourbonFilterQuery,
  buildBourbonUpdatePayload,
  tokenizeName,
  BourbonFilterState,
  DEFAULT_BOURBON_FILTERS,
  BourbonUpdateFormFields,
} from "@/lib/bourbons";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

type BourbonInsert = Database["public"]["Tables"]["bourbons"]["Insert"];
type BourbonRow = Database["public"]["Tables"]["bourbons"]["Row"];

export function useBourbons(search?: string, filters: BourbonFilterState = DEFAULT_BOURBON_FILTERS) {
  return useQuery({
    queryKey: ["bourbons", search, filters],
    queryFn: async () => {
      // Start with select — defer .order() until after filters so sortField wins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from("bourbons").select("*");

      const filter = buildBourbonSearchFilter(search);
      if (filter) {
        query = query.ilike("name", filter);
      }

      // Apply filter/sort state; buildBourbonFilterQuery adds .order(sortField)
      // only when sortField is non-null, so we fall back to .order("name") below.
      query = buildBourbonFilterQuery(query, filters);

      if (!filters.sortField) {
        query = query.order("name");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAddBourbon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BourbonInsert) => {
      const { data, error } = await supabase
        .from("bourbons")
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error("[useAddBourbon] Supabase error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload,
        });
        throw error;
      }
      return data as BourbonRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bourbons"] });
    },
  });
}

/**
 * Search for bourbons similar to the given name using token-based AND ILIKE matching.
 * Each whitespace-separated token generates a chained .ilike('name', '%token%') clause,
 * so only bourbons whose names contain every token are returned (token order is ignored).
 * Returns up to 10 results. Exported for testing.
 */
export async function searchSimilarBourbons(
  client: SupabaseClient<Database>,
  name: string,
): Promise<BourbonRow[]> {
  const tokens = tokenizeName(name);
  if (tokens.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = client.from("bourbons").select("*");
  for (const token of tokens) {
    query = query.ilike("name", `%${token}%`);
  }
  const { data, error } = await query.limit(10);
  if (error) throw error;
  return (data ?? []) as BourbonRow[];
}

const SIMILAR_BOURBONS_DEBOUNCE_MS = 400;

export function useSearchSimilarBourbons(name: string) {
  const [debouncedName, setDebouncedName] = useState(name);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(name), SIMILAR_BOURBONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [name]);

  return useQuery({
    queryKey: ["bourbons", "similar", debouncedName],
    queryFn: () => searchSimilarBourbons(supabase, debouncedName),
    enabled: debouncedName.trim().length >= 3,
    staleTime: 30_000,
  });
}

export function useUpdateBourbon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updatedBy,
      fields,
    }: {
      id: string;
      updatedBy: string;
      fields: BourbonUpdateFormFields;
    }) => {
      const payload = buildBourbonUpdatePayload(updatedBy, fields);
      const { data, error } = await supabase
        .from("bourbons")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BourbonRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["bourbon", variables.id] });
      qc.invalidateQueries({ queryKey: ["bourbons"] });
    },
  });
}

export interface BourbonDeletionImpact {
  tastings: number;
  collection: number;
  wishlist: number;
  community_comments: number;
  group_comments: number;
}

export function useBourbonDeletionImpact(id: string | undefined) {
  return useQuery({
    queryKey: ["bourbon", id, "deletion-impact"],
    queryFn: async (): Promise<BourbonDeletionImpact> => {
      const [
        { count: tastings, error: e1 },
        { count: collection, error: e2 },
        { count: wishlist, error: e3 },
        { count: communityComments, error: e4 },
        { count: groupComments, error: e5 },
      ] = await Promise.all([
        supabase.from("tastings").select("*", { count: "exact", head: true }).eq("bourbon_id", id!),
        supabase.from("user_collection").select("*", { count: "exact", head: true }).eq("bourbon_id", id!),
        supabase.from("user_wishlist").select("*", { count: "exact", head: true }).eq("bourbon_id", id!),
        supabase.from("bourbon_comments").select("*", { count: "exact", head: true }).eq("bourbon_id", id!).eq("visibility", "public"),
        supabase.from("bourbon_comments").select("*", { count: "exact", head: true }).eq("bourbon_id", id!).eq("visibility", "group"),
      ]);
      if (e1 ?? e2 ?? e3 ?? e4 ?? e5) throw e1 ?? e2 ?? e3 ?? e4 ?? e5;
      return {
        tastings: tastings ?? 0,
        collection: collection ?? 0,
        wishlist: wishlist ?? 0,
        community_comments: communityComments ?? 0,
        group_comments: groupComments ?? 0,
      };
    },
    enabled: !!id,
  });
}

export function useDeleteBourbon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bourbons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["bourbons"] });
      qc.invalidateQueries({ queryKey: ["bourbon", id] });
    },
  });
}

export function useBourbon(id: string | undefined) {
  return useQuery({
    queryKey: ["bourbon", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("bourbons")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
