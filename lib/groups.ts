/**
 * Pure business logic for groups.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type GroupMemberStatus = 'pending' | 'accepted' | 'declined';
type GroupRecommendationInsert = Database['public']['Tables']['group_recommendations']['Insert'];

/**
 * Returns true if transitioning a group_member's status from `from` to `to`
 * is a valid operation.
 *
 * Valid transitions:
 *   pending → accepted  (user accepts invite)
 *   pending → declined  (user declines invite)
 *
 * All other transitions are invalid (including same-state and reverse).
 */
export function isValidInviteTransition(
  from: GroupMemberStatus,
  to: GroupMemberStatus,
): boolean {
  return from === 'pending' && (to === 'accepted' || to === 'declined');
}

/**
 * Build the Supabase insert payload for a group bourbon recommendation.
 */
export function buildRecommendationPayload(
  groupId: string,
  bourbonId: string,
  userId: string,
  note?: string,
): GroupRecommendationInsert {
  return {
    group_id: groupId,
    bourbon_id: bourbonId,
    recommended_by: userId,
    note: note ?? null,
  };
}
