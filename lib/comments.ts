/**
 * Pure business logic for bourbon comments.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type CommentInsert = Database['public']['Tables']['bourbon_comments']['Insert'];

export type CommentScope = 'public' | 'group';

/**
 * Resolve the visibility scope for a comment.
 * A comment is group-scoped when a groupId is provided; otherwise public.
 */
export function resolveCommentScope(groupId: string | null | undefined): CommentScope {
  return groupId ? 'group' : 'public';
}

/**
 * Build the Supabase insert payload for a new comment.
 * When groupId is provided the comment is group-scoped; otherwise public.
 */
export function buildCommentPayload(
  userId: string,
  bourbonId: string,
  body: string,
  groupId?: string | null,
): CommentInsert {
  if (groupId) {
    return {
      user_id: userId,
      bourbon_id: bourbonId,
      body,
      visibility: 'group',
      group_id: groupId,
    };
  }
  return {
    user_id: userId,
    bourbon_id: bourbonId,
    body,
    visibility: 'public',
    group_id: null,
  };
}
