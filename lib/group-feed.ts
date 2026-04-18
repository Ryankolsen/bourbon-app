/**
 * Pure business logic for sharing tastings to groups.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type GroupFeedItemInsert = Database['public']['Tables']['group_feed_items']['Insert'];

/**
 * Build the Supabase insert payload for sharing a tasting to a group.
 */
export function buildShareToGroupPayload(
  tastingId: string,
  groupId: string,
  sharedByUserId: string,
): GroupFeedItemInsert {
  return {
    tasting_id: tastingId,
    group_id: groupId,
    shared_by_user_id: sharedByUserId,
  };
}
