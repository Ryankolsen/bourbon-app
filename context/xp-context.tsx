/**
 * XpContext — client-side XP notification system.
 *
 * Subscribes to `xp_events` via Supabase Realtime (filtered to the current
 * user). Each INSERT dispatches a notification into a queue; XpToast reads
 * the queue and shows toasts sequentially. TanStack Query's user-xp cache is
 * invalidated on each event so profile displays update automatically.
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

// ── Types ────────────────────────────────────────────────────────────────────

export interface XpNotification {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
}

interface XpContextValue {
  /** The currently-displayed notification, or null when the queue is empty. */
  current: XpNotification | null;
  /** Advance the queue — called by XpToast after the toast auto-dismisses. */
  advance: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const XpContext = createContext<XpContextValue>({
  current: null,
  advance: () => {},
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const advance = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

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

          const notification: XpNotification = {
            id: nextNotifId(),
            xpAwarded: row.xp_awarded as number,
            eventType: row.event_type as string,
            label: getXpEventLabel(row.event_type as string),
            promoted: (row.promoted as boolean) ?? false,
            newBelt: (row.new_belt as number) ?? 1,
          };

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
    <XpContext.Provider value={{ current, advance }}>
      {children}
    </XpContext.Provider>
  );
}
