/**
 * Pure business logic for tastings.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type TastingRow = Database['public']['Tables']['tastings']['Row'];
type TastingInsert = Database['public']['Tables']['tastings']['Insert'];

export interface TastingFormFields {
  rating: number | null;
  nose: string;
  palate: string;
  finish: string;
  overallNotes: string;
}

/**
 * Build the Supabase insert payload for a new tasting from raw form values.
 * Trims text fields and converts empty strings to null.
 */
export function buildTastingPayload(
  userId: string,
  bourbonId: string,
  fields: TastingFormFields,
): TastingInsert {
  return {
    user_id: userId,
    bourbon_id: bourbonId,
    rating: fields.rating,
    nose: fields.nose.trim() || null,
    palate: fields.palate.trim() || null,
    finish: fields.finish.trim() || null,
    overall_notes: fields.overallNotes.trim() || null,
  };
}

/**
 * Filter a list of tastings to only those matching a given bourbon ID.
 */
export function filterTastingsByBourbon(
  tastings: TastingRow[],
  bourbonId: string,
): TastingRow[] {
  return tastings.filter((t) => t.bourbon_id === bourbonId);
}
