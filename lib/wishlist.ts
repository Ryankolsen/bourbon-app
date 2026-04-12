/**
 * Pure business logic for wishlist operations.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type WishlistRow = Database['public']['Tables']['user_wishlist']['Row'];
type WishlistInsert = Database['public']['Tables']['user_wishlist']['Insert'];

export interface WishlistAddOptions {
  priority?: number;
  notes?: string | null;
}

/**
 * Build the Supabase insert payload for adding a bourbon to the wishlist.
 */
export function buildAddToWishlistPayload(
  userId: string,
  bourbonId: string,
  opts: WishlistAddOptions = {},
): WishlistInsert {
  return {
    user_id: userId,
    bourbon_id: bourbonId,
    priority: opts.priority ?? 0,
    notes: opts.notes ?? null,
  };
}

/**
 * Check whether a bourbon is already on the wishlist.
 * Pure array scan — no DB call needed when the list is already loaded.
 */
export function isAlreadyWishlisted(
  wishlist: WishlistRow[],
  bourbonId: string,
): boolean {
  return wishlist.some((item) => item.bourbon_id === bourbonId);
}
