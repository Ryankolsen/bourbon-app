import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { BourbonFilterState, BourbonTypeValue } from "@/lib/bourbons";

type CollectionInsert = Database["public"]["Tables"]["user_collection"]["Insert"];

// ---------------------------------------------------------------------------
// Client-side filter + sort for collection items
// ---------------------------------------------------------------------------

type AnyBourbonRow = Record<string, unknown> | null;

function getBourbonField(bourbon: AnyBourbonRow, field: string): unknown {
  return bourbon ? bourbon[field] : undefined;
}

/**
 * Filter and sort collection items client-side using a BourbonFilterState.
 * Reads filter criteria against the nested `bourbons` object on each item.
 * When sortField is null the original DB order (created_at DESC) is preserved.
 */
export function filterCollectionItems<T extends { bourbons: unknown }>(
  items: T[],
  filters: BourbonFilterState,
): T[] {
  const { types, proofMin, proofMax, ageMin, ageMax, nasOnly, distillery, sortField, sortAscending } = filters;

  let result = items.filter((item) => {
    const b = item.bourbons as AnyBourbonRow;
    if (!b) return false;

    if (types.length > 0) {
      const itemType = getBourbonField(b, "type") as BourbonTypeValue | null;
      if (!itemType || !types.includes(itemType)) return false;
    }

    const proof = getBourbonField(b, "proof") as number | null;
    if (proofMin !== null && (proof === null || proof < proofMin)) return false;
    if (proofMax !== null && (proof === null || proof > proofMax)) return false;

    const age = getBourbonField(b, "age_statement") as number | null;
    if (nasOnly) {
      if (age !== null) return false;
    } else {
      if (ageMin !== null && (age === null || age < ageMin)) return false;
      if (ageMax !== null && (age === null || age > ageMax)) return false;
    }

    if (distillery) {
      const dist = getBourbonField(b, "distillery") as string | null;
      if (!dist || !dist.toLowerCase().includes(distillery.toLowerCase())) return false;
    }

    return true;
  });

  if (sortField) {
    result = [...result].sort((a, b) => {
      const bA = a.bourbons as AnyBourbonRow;
      const bB = b.bourbons as AnyBourbonRow;
      const valA = getBourbonField(bA, sortField) as string | number | null;
      const valB = getBourbonField(bB, sortField) as string | number | null;

      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortAscending ? cmp : -cmp;
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// useCollection hook
// ---------------------------------------------------------------------------

export function useCollection(userId: string | undefined, filters?: BourbonFilterState) {
  const query = useQuery({
    queryKey: ["collection", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_collection")
        .select(`*, bourbons(*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Collection query error:", JSON.stringify(error));
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });

  const data = useMemo(() => {
    if (!query.data) return query.data;
    if (!filters) return query.data;
    // Only apply if any filter is active; avoids needless re-sort
    const hasFilter =
      filters.types.length > 0 ||
      filters.proofMin !== null ||
      filters.proofMax !== null ||
      filters.ageMin !== null ||
      filters.ageMax !== null ||
      filters.nasOnly ||
      filters.distillery !== null ||
      filters.sortField !== null;
    if (!hasFilter) return query.data;
    return filterCollectionItems(query.data as { bourbons: unknown }[], filters) as typeof query.data;
  }, [query.data, filters]);

  return { ...query, data };
}

export function useAddToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: CollectionInsert) => {
      const { data, error } = await supabase
        .from("user_collection")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["collection", data.user_id] });
    },
  });
}

