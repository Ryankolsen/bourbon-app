import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupNotificationRow {
  id: string;
  owner_id: string;
  joiner_id: string;
  group_id: string;
  created_at: string;
  dismissed_at: string | null;
  profiles: { display_name: string | null; username: string | null } | null;
  groups: { id: string; name: string } | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch undismissed group join notifications for the given owner.
 * Returns [] immediately when ownerId is undefined (no query fired).
 */
export function useGroupNotifications(ownerId: string | undefined) {
  return useQuery<GroupNotificationRow[]>({
    queryKey: ["group-notifications", ownerId],
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from("group_notifications")
        .select(
          "*, profiles!group_notifications_joiner_id_fkey(display_name, username), groups(id, name)"
        )
        .eq("owner_id", ownerId)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GroupNotificationRow[];
    },
    enabled: !!ownerId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Soft-dismiss a single notification by setting dismissed_at = now().
 * Applies an optimistic update so the card disappears immediately.
 */
export function useDismissGroupNotification(ownerId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ["group-notifications", ownerId];

  return useMutation({
    mutationFn: async ({ notificationId }: { notificationId: string }) => {
      const { error } = await supabase
        .from("group_notifications")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onMutate: async ({ notificationId }) => {
      // Cancel in-flight refetches so they don't overwrite the optimistic update
      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData<GroupNotificationRow[]>(queryKey);

      // Optimistically remove the dismissed row
      qc.setQueryData<GroupNotificationRow[]>(queryKey, (old) =>
        (old ?? []).filter((n) => n.id !== notificationId)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export interface RealtimeNotificationPayload {
  id: string;
  owner_id: string;
  group_id: string;
  joiner_id: string;
  created_at: string;
  dismissed_at: string | null;
}

/**
 * Subscribe to Supabase Realtime INSERT events on group_notifications for the
 * given owner. Calls `onInsert` with the new row whenever one arrives.
 * No-ops when ownerId is undefined. Cleans up the channel on unmount.
 */
export function useGroupNotificationsRealtime(
  ownerId: string | undefined,
  onInsert: (payload: RealtimeNotificationPayload) => void
) {
  // Keep a stable ref to the callback so the effect doesn't re-run when it changes.
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!ownerId) return;

    const channel = supabase
      .channel(`group-notifications:${ownerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_notifications",
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload: { new: RealtimeNotificationPayload }) => {
          onInsertRef.current(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId]);
}
