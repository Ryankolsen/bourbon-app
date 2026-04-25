/**
 * TanStack Query hooks for group sale alerts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buildSaleAlertPayload, buildRemovalPayload, isSaleAlertExpired } from '@/lib/sale-alerts';

export interface SaleAlert {
  id: string;
  group_id: string;
  bourbon_id: string;
  posted_by: string;
  price: string;
  place_id: string;
  place_name: string;
  place_address: string;
  note: string | null;
  created_at: string;
  removed_at: string | null;
  removed_by: string | null;
  // Joined fields
  bourbon_name: string;
  bourbon_distillery: string | null;
  poster_display_name: string | null;
  poster_username: string | null;
  poster_avatar_url: string | null;
}

/**
 * Fetch active (non-removed, non-expired) sale alerts for a group.
 */
export function useGroupSaleAlerts(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-sale-alerts', groupId],
    queryFn: async (): Promise<SaleAlert[]> => {
      if (!groupId) return [];

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('group_sale_alerts')
        .select(
          `*, bourbons(id, name, distillery), poster:profiles!group_sale_alerts_posted_by_fkey(display_name, username, avatar_url)`
        )
        .eq('group_id', groupId)
        .is('removed_at', null)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).filter((item: any) => !isSaleAlertExpired(item.created_at)).map((item: any): SaleAlert => {
        const bourbon = item.bourbons ?? {};
        const poster = item.poster ?? {};
        return {
          id: item.id,
          group_id: item.group_id,
          bourbon_id: item.bourbon_id,
          posted_by: item.posted_by,
          price: item.price,
          place_id: item.place_id,
          place_name: item.place_name,
          place_address: item.place_address,
          note: item.note ?? null,
          created_at: item.created_at,
          removed_at: item.removed_at ?? null,
          removed_by: item.removed_by ?? null,
          bourbon_name: bourbon.name ?? '',
          bourbon_distillery: bourbon.distillery ?? null,
          poster_display_name: poster.display_name ?? null,
          poster_username: poster.username ?? null,
          poster_avatar_url: poster.avatar_url ?? null,
        };
      });
    },
    enabled: !!groupId,
  });
}

/**
 * Mutation: post a new sale alert to a group.
 */
export function useCreateSaleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      bourbonId,
      userId,
      price,
      placeId,
      placeName,
      placeAddress,
      note,
    }: {
      groupId: string;
      bourbonId: string;
      userId: string;
      price: string;
      placeId: string;
      placeName: string;
      placeAddress: string;
      note?: string;
    }) => {
      const { error } = await supabase
        .from('group_sale_alerts')
        .insert(buildSaleAlertPayload(groupId, bourbonId, userId, price, placeId, placeName, placeAddress, note));
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['group-sale-alerts', groupId] });
    },
  });
}

/**
 * Mutation: soft-delete (remove) a sale alert.
 * Any accepted group member can remove an alert once stock is gone.
 * Uses optimistic update to immediately hide the alert from the UI.
 */
export function useRemoveSaleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      alertId,
      groupId,
      userId,
    }: {
      alertId: string;
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('group_sale_alerts')
        .update(buildRemovalPayload(userId))
        .eq('id', alertId);
      if (error) throw error;
      return { alertId, groupId };
    },
    onMutate: async ({ alertId, groupId }) => {
      await qc.cancelQueries({ queryKey: ['group-sale-alerts', groupId] });
      const previous = qc.getQueryData<SaleAlert[]>(['group-sale-alerts', groupId]);
      qc.setQueryData<SaleAlert[]>(['group-sale-alerts', groupId], (old) =>
        (old ?? []).filter((a) => a.id !== alertId)
      );
      return { previous };
    },
    onError: (_err, { groupId }, context) => {
      if (context?.previous) {
        qc.setQueryData(['group-sale-alerts', groupId], context.previous);
      }
    },
    onSettled: (_data, _err, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['group-sale-alerts', groupId] });
    },
  });
}
