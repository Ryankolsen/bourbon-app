/**
 * Pure business logic for group sale alerts.
 * No React, no Supabase — fully unit-testable.
 */

import { Database } from '@/types/database';

type SaleAlertInsert = Database['public']['Tables']['group_sale_alerts']['Insert'];
type SaleAlertUpdate = Database['public']['Tables']['group_sale_alerts']['Update'];

const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Build the Supabase insert payload for a new group sale alert.
 */
export function buildSaleAlertPayload(
  groupId: string,
  bourbonId: string,
  userId: string,
  price: string,
  placeId: string,
  placeName: string,
  placeAddress: string,
  note?: string,
): SaleAlertInsert {
  return {
    group_id: groupId,
    bourbon_id: bourbonId,
    posted_by: userId,
    price,
    place_id: placeId,
    place_name: placeName,
    place_address: placeAddress,
    note: note ?? null,
  };
}

/**
 * Returns true if the alert is older than 30 days and should be treated as expired.
 */
export function isSaleAlertExpired(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() >= EXPIRY_MS;
}

/**
 * Build the Supabase update payload to soft-delete a sale alert.
 */
export function buildRemovalPayload(userId: string): { removed_at: string; removed_by: string } {
  return {
    removed_at: new Date().toISOString(),
    removed_by: userId,
  };
}
