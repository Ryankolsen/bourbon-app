import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

// ── Shared query key ──────────────────────────────────────────────────────────

export const SUGGESTIONS_QUERY_KEY = ["bourbon-suggestions"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SuggestionRow {
  id: string;
  bourbon_id: string;
  submitted_by: string | null;
  submission_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  bourbons: { name: string } | null;
  profiles: { display_name: string | null } | null;
}

type SuggestionInsert = Database["public"]["Tables"]["bourbon_edit_suggestions"]["Insert"];

export interface BourbonSuggestion {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface SubmitBourbonSuggestionInput {
  bourbonId: string;
  submittedBy: string;
  suggestions: BourbonSuggestion[];
}

/**
 * Mutation hook that queues one or more bourbon field corrections for admin review.
 *
 * Inserts one row per changed field into `bourbon_edit_suggestions`.
 * All rows from a single call share the same `submission_id` (a client-generated
 * UUID) so an admin can view the full changeset together.
 *
 * This is the Tier 2 counterpart to `useUpdateBourbon` (Tier 1).
 */
export function useSubmitBourbonSuggestion() {
  return useMutation({
    mutationFn: async ({
      bourbonId,
      submittedBy,
      suggestions,
    }: SubmitBourbonSuggestionInput) => {
      if (suggestions.length === 0) return;

      const submissionId = randomUUID();

      for (const suggestion of suggestions) {
        const row: SuggestionInsert = {
          bourbon_id: bourbonId,
          submitted_by: submittedBy,
          submission_id: submissionId,
          field_name: suggestion.fieldName,
          old_value: suggestion.oldValue,
          new_value: suggestion.newValue,
        };

        const { error } = await supabase
          .from("bourbon_edit_suggestions")
          .insert(row);

        if (error) throw new Error(error.message);
      }
    },
  });
}

// ── Admin hooks ───────────────────────────────────────────────────────────────

/**
 * Query hook that fetches all pending bourbon edit suggestions for admin review.
 * Results are ordered oldest-first (chronological) and include the bourbon name
 * and submitting user's display name via joined relations.
 */
export function useBourbonSuggestions() {
  return useQuery<SuggestionRow[]>({
    queryKey: SUGGESTIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bourbon_edit_suggestions")
        .select(
          "*, bourbons(name), profiles!bourbon_edit_suggestions_submitted_by_fkey(display_name)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
    },
  });
}

/**
 * Mutation hook that approves a pending suggestion by calling the
 * `apply_bourbon_suggestion` RPC, then invalidates the suggestions list.
 */
export function useApproveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ suggestionId }: { suggestionId: string }) => {
      const { error } = await supabase.rpc("apply_bourbon_suggestion", {
        p_suggestion_id: suggestionId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook that rejects a pending suggestion by updating its status,
 * reviewed_by, reviewed_at, and optionally review_note, then invalidates
 * the suggestions list.
 */
export function useRejectSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      suggestionId,
      reviewedBy,
      reviewNote,
    }: {
      suggestionId: string;
      reviewedBy: string;
      reviewNote?: string;
    }) => {
      type SuggestionUpdate =
        Database["public"]["Tables"]["bourbon_edit_suggestions"]["Update"];
      const update: SuggestionUpdate = {
        status: "rejected",
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      };
      if (reviewNote !== undefined) {
        update.review_note = reviewNote;
      }
      const { error } = await supabase
        .from("bourbon_edit_suggestions")
        .update(update)
        .eq("id", suggestionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
    },
  });
}
