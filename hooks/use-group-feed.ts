import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buildShareToGroupPayload } from '@/lib/group-feed';

export interface GroupFeedItem {
  id: string;
  group_id: string;
  tasting_id: string;
  shared_by_user_id: string;
  created_at: string;
  // Tasting fields
  bourbon_id: string;
  rating: number | null;
  tasted_at: string;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall_notes: string | null;
  collection_id: string | null;
  bourbon_name: string;
  // Taster (person who logged the tasting)
  taster_user_id: string;
  taster_display_name: string | null;
  taster_username: string | null;
  taster_avatar_url: string | null;
  // Sharer (person who shared it to the group)
  sharer_display_name: string | null;
  sharer_username: string | null;
  sharer_avatar_url: string | null;
}

/** Fetch shared items for a group feed */
export function useGroupFeed(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-feed', groupId],
    queryFn: async (): Promise<GroupFeedItem[]> => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_feed_items')
        .select(
          `*, tastings(id, user_id, bourbon_id, rating, tasted_at, nose, palate, finish, overall_notes, collection_id, bourbons!tastings_bourbon_id_fkey(name), profiles!tastings_user_id_fkey(display_name, username, avatar_url)), sharer:profiles!group_feed_items_shared_by_user_id_fkey(display_name, username, avatar_url)`
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((item: any): GroupFeedItem => {
        const tasting = item.tastings ?? {};
        const tasterProfile = tasting.profiles ?? {};
        const sharer = item.sharer ?? {};
        return {
          id: item.id,
          group_id: item.group_id,
          tasting_id: item.tasting_id,
          shared_by_user_id: item.shared_by_user_id,
          created_at: item.created_at,
          bourbon_id: tasting.bourbon_id ?? '',
          rating: tasting.rating ?? null,
          tasted_at: tasting.tasted_at ?? item.created_at,
          nose: tasting.nose ?? null,
          palate: tasting.palate ?? null,
          finish: tasting.finish ?? null,
          overall_notes: tasting.overall_notes ?? null,
          collection_id: tasting.collection_id ?? null,
          bourbon_name: tasting.bourbons?.name ?? '',
          taster_user_id: tasting.user_id ?? '',
          taster_display_name: tasterProfile.display_name ?? null,
          taster_username: tasterProfile.username ?? null,
          taster_avatar_url: tasterProfile.avatar_url ?? null,
          sharer_display_name: sharer.display_name ?? null,
          sharer_username: sharer.username ?? null,
          sharer_avatar_url: sharer.avatar_url ?? null,
        };
      });
    },
    enabled: !!groupId,
  });
}

/** Mutation: share a tasting to a group */
export function useShareTastingToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tastingId,
      groupId,
      sharedByUserId,
    }: {
      tastingId: string;
      groupId: string;
      sharedByUserId: string;
    }) => {
      const { error } = await supabase
        .from('group_feed_items')
        .insert(buildShareToGroupPayload(tastingId, groupId, sharedByUserId));
      if (error) throw error;
      return { tastingId, groupId, sharedByUserId };
    },
    onSuccess: ({ groupId }) => {
      qc.invalidateQueries({ queryKey: ['group-feed', groupId] });
    },
  });
}
