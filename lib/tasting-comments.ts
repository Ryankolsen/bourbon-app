/**
 * Pure business logic for tasting comment interactions.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type TastingCommentInsert = Database['public']['Tables']['tasting_comments']['Insert'];

/**
 * Build the Supabase insert payload for posting a comment.
 * Trims `body`; throws if blank after trimming.
 */
export function buildCommentPayload(
  userId: string,
  tastingId: string,
  body: string,
): TastingCommentInsert {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Comment body must not be blank');
  return { user_id: userId, tasting_id: tastingId, body: trimmed };
}
