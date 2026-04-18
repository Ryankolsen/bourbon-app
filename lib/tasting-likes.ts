/**
 * Pure business logic for tasting like/unlike interactions.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type TastingLikeInsert = Database['public']['Tables']['tasting_likes']['Insert'];

export interface UnlikeTarget {
  user_id: string;
  tasting_id: string;
}

/**
 * Build the Supabase insert payload for liking a tasting.
 */
export function buildLikePayload(
  userId: string,
  tastingId: string,
): TastingLikeInsert {
  return { user_id: userId, tasting_id: tastingId };
}

/**
 * Build the delete target for unliking a tasting.
 * Returns the field values needed to match the row to delete.
 */
export function buildUnlikeTarget(
  userId: string,
  tastingId: string,
): UnlikeTarget {
  return { user_id: userId, tasting_id: tastingId };
}
