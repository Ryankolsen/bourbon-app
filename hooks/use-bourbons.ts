import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildBourbonSearchFilter,
  buildBourbonFilterQuery,
  tokenizeName,
  BourbonFilterState,
  DEFAULT_BOURBON_FILTERS,
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
 * Search for bourbons similar to the given name using token-based OR ILIKE matching.
 * Each whitespace-separated token in the name generates an ILIKE '%token%' clause.
 * Returns up to 10 results. Exported for testing.
 */
export async function searchSimilarBourbons(
  client: SupabaseClient<Database>,
  name: string,
): Promise<BourbonRow[]> {
  const tokens = tokenizeName(name);
  if (tokens.length === 0) return [];

  const orFilter = tokens.map((t) => `name.ilike.%${t}%`).join(",");
  const { data, error } = await client
    .from("bourbons")
    .select("*")
    .or(orFilter)
    .limit(10);
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
