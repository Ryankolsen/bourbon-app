import { useMutation } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

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

        if (error) throw error;
      }
    },
  });
}
