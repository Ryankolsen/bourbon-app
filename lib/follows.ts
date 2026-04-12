/**
 * Pure business logic for user follow relationships.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type UserFollowInsert = Database['public']['Tables']['user_follows']['Insert'];

export interface UnfollowTarget {
  follower_id: string;
  following_id: string;
}

/**
 * Build the Supabase insert payload for following a user.
 */
export function buildFollowPayload(
  followerId: string,
  followingId: string,
): UserFollowInsert {
  return { follower_id: followerId, following_id: followingId };
}

/**
 * Build the delete target for unfollowing a user.
 * Returns the field values needed to match the row to delete.
 */
export function buildUnfollowTarget(
  followerId: string,
  followingId: string,
): UnfollowTarget {
  return { follower_id: followerId, following_id: followingId };
}
