/**
 * XpContext — client-side XP notification system.
 *
 * Subscribes to `xp_events` via Supabase Realtime (filtered to the current
 * user). Each INSERT dispatches a notification into a queue; XpToast reads
 * the queue and shows toasts sequentially. TanStack Query's user-xp cache is
 * invalidated on each event so profile displays update automatically.
 *
 * Also exposes `enqueue` so callers can push a notification directly (e.g.
 * from the check-in RPC result) without waiting for the Realtime channel to
 * establish. A seen-IDs set deduplicates notifications that arrive via both
 * paths.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { getXpEventLabel } from "@/lib/belt-config";
import { useAuth } from "@/hooks/use-auth";
import { TomorrowXp } from "@/lib/streak-utils";

// ── Types ────────────────────────────────────────────────────────────────────

export interface XpNotification {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
  /** Streak day count at time of the event (populated for daily_checkin). */
  streakDays?: number;
  /** True when the streak was broken and reset to Day 1 (populated for daily_checkin). */
  isReset?: boolean;
  /** Tomorrow's XP breakdown (populated for daily_checkin). */
  tomorrowXp?: TomorrowXp | null;
}

interface XpContextValue {
  /** The currently-displayed notification, or null when the queue is empty. */
  current: XpNotification | null;
  /** Advance the queue — called by XpToast after the toast auto-dismisses. */
  advance: () => void;
  /**
   * Imperatively push a notification into the queue (bypasses Realtime).
   * Ignored when xpAwarded is 0 or when the same `id` was already enqueued.
   */
  enqueue: (notification: XpNotification) => void;
  /**
   * The most recent belt promotion event, or null if none has occurred this
   * session. Independent of the display queue — advance() does not clear it.
   */
  latestPromotion: { belt: number; id: string } | null;
}

// ── Context ──────────────────────────────────────────────────────────────────

const XpContext = createContext<XpContextValue>({
  current: null,
  advance: () => {},
  enqueue: () => {},
  latestPromotion: null,
});

export function useXpNotification(): XpContextValue {
  return useContext(XpContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

let _notifSeq = 0;
function nextNotifId(): string {
  return `xp-notif-${++_notifSeq}`;
}

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<XpNotification[]>([]);
  const [latestPromotion, setLatestPromotion] = useState<{ belt: number; id: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  /** Tracks notification IDs already added to the queue (deduplication). */
  const seenIds = useRef<Set<string>>(new Set());

  const advance = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  /**
   * Push a notification directly into the queue, bypassing Realtime.
   * Deduplicates by `notification.id` so a subsequent Realtime event for the
   * same logical event is silently dropped.
   */
  const enqueue = useCallback(
    (notification: XpNotification) => {
      if (notification.xpAwarded === 0) return;
      if (seenIds.current.has(notification.id)) return;
      seenIds.current.add(notification.id);
      setQueue((prev) => [...prev, notification]);
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["user-xp", user.id] });
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`xp_events:${user.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "xp_events",
          filter: `user_id=eq.${user.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload.new;
          if (!row || row.xp_awarded === 0) return;

          // Use the DB row UUID for deduplication when present; otherwise
          // fall back to a locally-generated ID (should not happen in practice).
          const notifId: string = (row.id as string) ?? nextNotifId();
          if (seenIds.current.has(notifId)) return;
          seenIds.current.add(notifId);

          const promoted = (row.promoted as boolean) ?? false;
          const newBelt = (row.new_belt as number) ?? 1;

          const notification: XpNotification = {
            id: notifId,
            xpAwarded: row.xp_awarded as number,
            eventType: row.event_type as string,
            label: getXpEventLabel(row.event_type as string),
            promoted,
            newBelt,
          };

          if (promoted) {
            setLatestPromotion({ belt: newBelt, id: notifId });
          }

          setQueue((prev) => [...prev, notification]);

          // Invalidate the user-xp query so profile displays refresh
          queryClient.invalidateQueries({ queryKey: ["user-xp", user.id] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const current = queue[0] ?? null;

  return (
    <XpContext.Provider value={{ current, advance, enqueue, latestPromotion }}>
      {children}
    </XpContext.Provider>
  );
}
