/**
 * Pure business logic for collection operations.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type UserCollectionRow = Database['public']['Tables']['user_collection']['Row'];
type CollectionInsert = Database['public']['Tables']['user_collection']['Insert'];

export interface CollectionAddOptions {
  purchase_price?: number | null;
  purchase_date?: string | null;
  purchase_location?: string | null;
  notes?: string | null;
}

/**
 * Build the Supabase insert payload for adding a bourbon to the collection.
 */
export function buildAddToCollectionPayload(
  userId: string,
  bourbonId: string,
  opts: CollectionAddOptions = {},
): CollectionInsert {
  return {
    user_id: userId,
    bourbon_id: bourbonId,
    purchase_price: opts.purchase_price ?? null,
    purchase_date: opts.purchase_date ?? null,
    purchase_location: opts.purchase_location ?? null,
    notes: opts.notes ?? null,
  };
}

/**
 * Check whether a bourbon is already in the collection.
 * Pure array scan — no DB call needed when the list is already loaded.
 */
export function isAlreadyInCollection(
  collection: UserCollectionRow[],
  bourbonId: string,
): boolean {
  return collection.some((item) => item.bourbon_id === bourbonId);
}
